"""
backend/app/ml/train.py

Training script with Optuna HPO and quantile regression for confidence intervals.
"""

import argparse
import json
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, mean_absolute_percentage_error
try:
    from sklearn.metrics import root_mean_squared_error
except ImportError:
    from sklearn.metrics import mean_squared_error
    def root_mean_squared_error(y_true, y_pred):
        return mean_squared_error(y_true, y_pred, squared=False)
    
from xgboost import XGBRegressor
import joblib

from app.database import engine
from app.ml.features import engineer_features, fit_encoder, apply_encoder, FEATURE_COLS
from app.models.ml_model import MLModelVersion
from app.database import SessionLocal

logger = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).parent.parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def run_optuna_hpo(X_train, y_train, X_test, y_test, n_trials=100):
    """Run Bayesian hyperparameter optimization with Optuna."""
    try:
        import optuna
        from optuna.samplers import TPESampler
    except ImportError:
        logger.warning("Optuna not installed, skipping HPO")
        return None

    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 200, 2000),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "max_depth": trial.suggest_int("max_depth", 4, 10),
            "min_child_weight": trial.suggest_float("min_child_weight", 1, 8, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "gamma": trial.suggest_float("gamma", 1e-8, 1.0, log=True),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
        }
        model = XGBRegressor(
            **params, random_state=42, tree_method="hist", device="cpu",
            early_stopping_rounds=100,
        )
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        preds = model.predict(X_test)
        return mean_absolute_error(y_test, preds)

    study = optuna.create_study(
        direction="minimize", sampler=TPESampler(seed=42),
        study_name="xgb_price_prediction",
    )
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
    logger.info("Best trial: MAE=%.2f, params=%s", study.best_value, study.best_params)
    return study.best_params


def train_quantile_model(X_train, y_train, X_test, y_test, quantile: float, params: dict) -> XGBRegressor:
    """Train a quantile regression model using empirical residuals."""
    q_params = params.copy()
    model = XGBRegressor(**q_params, random_state=42, tree_method="hist", device="cpu",
                         early_stopping_rounds=100, objective="reg:absoluteerror")
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    return model


def train(
    test_size: float = 0.2,
    random_state: int = 42,
    model_tag: str = "xgb_v1",
    use_optuna: bool = False,
    optuna_trials: int = 100,
    **kwargs,
) -> dict:
    """Train XGBoost model with residual-based confidence intervals."""

    query = """
        SELECT * FROM car_listings
        WHERE is_cleaned = true
          AND price_usd IS NOT NULL
          AND price_usd > 0
          AND year >= 2000
    """
    df = pd.read_sql(query, engine)
    logger.info("Training on %d records", len(df))

    if len(df) < 50:
        raise ValueError(f"Insufficient data: {len(df)} records (need >= 50)")

    # Preserve target BEFORE feature engineering
    y = df["price_usd"].astype(float)

    # Feature engineering
    df = engineer_features(df)
    encoder = fit_encoder(df)
    df = apply_encoder(df, encoder)

    X = df[FEATURE_COLS]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    # HPO
    if use_optuna:
        logger.info("Running Optuna HPO with %d trials...", optuna_trials)
        best_params = run_optuna_hpo(X_train, y_train, X_test, y_test, optuna_trials)
        if best_params:
            kwargs.update(best_params)

    # Default params
    default_params = {
        "n_estimators": 300,      # reduced from 600
        "learning_rate": 0.05,
        "max_depth": 4,           # reduced from 6
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,    # increased from 1
        "gamma": 0.1,             # added
        "reg_alpha": 0.5,         # increased from 0.1
        "reg_lambda": 2, 
    }
    default_params.update(kwargs)

    # Train main model
    logger.info("Training main model...")
    model = XGBRegressor(
        **default_params, random_state=random_state,
        tree_method="hist", device="cpu", early_stopping_rounds=100,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # Train L1 (absolute error) model for robustness
    logger.info("Training L1-regularized model for confidence intervals...")
    model_q25 = XGBRegressor(
        **default_params, objective="reg:absoluteerror",
        random_state=random_state, tree_method="hist", device="cpu",
        early_stopping_rounds=100,
    )
    model_q25.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    model_q75 = XGBRegressor(
        **default_params, objective="reg:absoluteerror",
        random_state=random_state, tree_method="hist", device="cpu",
        early_stopping_rounds=100,
    )
    model_q75.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # Evaluate main model
    train_preds = model.predict(X_train)
    preds = model.predict(X_test)
    preds_l1 = model_q25.predict(X_test)

    train_mae = mean_absolute_error(y_train, train_preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = root_mean_squared_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    mape = mean_absolute_percentage_error(y_test, preds) * 100

    # Compute prediction intervals from residuals
    residuals = np.abs(y_test.values - preds)
    q25_residual = np.quantile(residuals, 0.25)
    q75_residual = np.quantile(residuals, 0.75)
    interval_width = q75_residual - q25_residual

    # Empirical coverage: what % of test set falls within ±1 std of residuals
    residual_std = np.std(residuals)
    coverage = np.mean(np.abs(y_test.values - preds) <= 1.96 * residual_std) * 100

    metrics = {
        "mae": round(float(mae), 2),
        "train_mae": round(float(train_mae), 2),
        "rmse": round(float(rmse), 2),
        "r2": round(float(r2), 4),
        "mape": round(float(mape), 2),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "features": [f for f in FEATURE_COLS if f != "source"],
        "feature_importance": {
            k: round(float(v), 4)
            for k, v in zip(FEATURE_COLS, model.feature_importances_)
        },
        "quantile_metrics": {
            "q25_residual_usd": round(float(q25_residual), 2),
            "q75_residual_usd": round(float(q75_residual), 2),
            "interval_width_usd": round(float(interval_width), 2),
            "coverage_pct": round(float(coverage), 2),
            "residual_std_usd": round(float(residual_std), 2),
        },
    }

    logger.info(f"MAE: ${mae:,.0f}  RMSE: ${rmse:,.0f}  R²: {r2:.3f}  MAPE: {mape:.1f}%")
    logger.info(f"CI (residual-based): ±${interval_width:,.0f}  coverage={coverage:.1f}%")

    # Save artifacts with timestamps
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    joblib.dump(model, MODELS_DIR / f"{model_tag}_{timestamp}.joblib")
    joblib.dump(model_q25, MODELS_DIR / f"{model_tag}_q25_{timestamp}.joblib")
    joblib.dump(model_q75, MODELS_DIR / f"{model_tag}_q75_{timestamp}.joblib")
    joblib.dump(encoder, MODELS_DIR / f"{model_tag}_encoder_{timestamp}.joblib")
    with open(MODELS_DIR / f"{model_tag}_metrics_{timestamp}.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Save as "latest" (non-timestamped)
    joblib.dump(model, MODELS_DIR / f"{model_tag}.joblib")
    joblib.dump(model_q25, MODELS_DIR / f"{model_tag}_q25.joblib")
    joblib.dump(model_q75, MODELS_DIR / f"{model_tag}_q75.joblib")
    joblib.dump(encoder, MODELS_DIR / f"{model_tag}_encoder.joblib")
    with open(MODELS_DIR / f"{model_tag}_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Register in DB (handle missing table gracefully)
    db = SessionLocal()
    try:
        # Check if table exists first
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if "ml_model_versions" not in inspector.get_table_names():
            logger.warning("ml_model_versions table does not exist — skipping DB registration")
            db.close()
            return metrics

        db.query(MLModelVersion).filter(
            MLModelVersion.model_tag == model_tag,
            MLModelVersion.is_active == True,
        ).update({"is_active": False}, synchronize_session=False)
        db.add(MLModelVersion(
            model_tag=model_tag,
            model_path=str(MODELS_DIR / f"{model_tag}_{timestamp}.joblib"),
            encoder_path=str(MODELS_DIR / f"{model_tag}_encoder_{timestamp}.joblib"),
            metrics=metrics,
            n_train=metrics["n_train"],
            n_test=metrics["n_test"],
            r2=metrics["r2"],
            mae=metrics["mae"],
            is_active=True,
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("DB registration failed: %s", e)
    finally:
        db.close()

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tune", action="store_true", help="Run Optuna HPO")
    parser.add_argument("--trials", type=int, default=100, help="Optuna trials (default 100)")
    parser.add_argument("--tag", type=str, default="xgb_v1", help="Model tag")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    metrics = train(
        model_tag=args.tag,
        use_optuna=args.tune,
        optuna_trials=args.trials,
    )
    print(json.dumps(metrics, indent=2))

