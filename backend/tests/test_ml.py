"""
test_ml.py — pytest suite for Phase 6 ML model
Run: pytest tests/test_ml.py -v
All tests are offline (no network, no Neon) unless marked @pytest.mark.integration
"""

import json
import os
import pytest
import numpy as np
import pandas as pd


# ── helpers ────────────────────────────────────────────────────────────────
SAMPLE_CAR = {
    "make": "Toyota", "model": "Vitz", "year": 2021,
    "mileage_km": 45000, "engine_cc": 1000,
    "fuel_type": "petrol", "transmission": "automatic",
    "body_type": "hatchback",
}

def make_df(overrides: dict = {}) -> pd.DataFrame:
    return pd.DataFrame([{**SAMPLE_CAR, **overrides}])


# ══════════════════════════════════════════════════════════
# Feature engineering tests
# ══════════════════════════════════════════════════════════

def test_feature_columns_present():
    from app.ml.features import engineer_features, FEATURE_COLS
    result = engineer_features(make_df())
    assert list(result.columns) == FEATURE_COLS

def test_car_age_is_correct():
    from app.ml.features import engineer_features, CURRENT_YEAR
    result = engineer_features(make_df({"year": 2021}))
    assert result["car_age"].iloc[0] == CURRENT_YEAR - 2021

def test_log_mileage_is_log1p():
    from app.ml.features import engineer_features
    result = engineer_features(make_df({"mileage_km": 45000}))
    expected = np.log1p(45000)
    assert abs(result["log_mileage"].iloc[0] - expected) < 0.001

def test_missing_mileage_uses_default():
    from app.ml.features import engineer_features, DEFAULTS
    result = engineer_features(make_df({"mileage_km": None}))
    expected = np.log1p(DEFAULTS["mileage_km"])
    assert abs(result["log_mileage"].iloc[0] - expected) < 0.001

def test_missing_engine_cc_uses_default():
    from app.ml.features import engineer_features, DEFAULTS
    result = engineer_features(make_df({"engine_cc": None}))
    assert result["engine_cc"].iloc[0] == DEFAULTS["engine_cc"]

def test_make_normalisation():
    from app.ml.features import engineer_features
    result = engineer_features(make_df({"make": "TOYOTA"}))
    assert result["make"].iloc[0] == "Toyota"

def test_fuel_type_lowercased():
    from app.ml.features import engineer_features
    result = engineer_features(make_df({"fuel_type": "Petrol"}))
    assert result["fuel_type"].iloc[0] == "petrol"

def test_encoder_unknown_make():
    """Unseen make at inference should get -1, not raise an exception."""
    from app.ml.features import engineer_features, fit_encoder, apply_encoder
    train_df = engineer_features(make_df())
    enc      = fit_encoder(train_df)
    test_df  = engineer_features(make_df({"make": "Lamborghini"}))
    encoded  = apply_encoder(test_df, enc)
    assert encoded["make"].iloc[0] == -1

def test_feature_output_no_nulls():
    from app.ml.features import engineer_features
    result = engineer_features(make_df())
    assert result.isnull().sum().sum() == 0, "Feature matrix must have no nulls"

def test_batch_features_same_as_single():
    """2-row batch must produce same features as two separate single calls."""
    from app.ml.features import engineer_features
    single1 = engineer_features(make_df({"year": 2020}))
    single2 = engineer_features(make_df({"year": 2022}))
    batch   = engineer_features(pd.DataFrame([
        {**SAMPLE_CAR, "year": 2020},
        {**SAMPLE_CAR, "year": 2022},
    ]))
    pd.testing.assert_frame_equal(batch.iloc[[0]].reset_index(drop=True),
                                  single1.reset_index(drop=True))
    pd.testing.assert_frame_equal(batch.iloc[[1]].reset_index(drop=True),
                                  single2.reset_index(drop=True))


# ══════════════════════════════════════════════════════════
# Predictor tests (require trained model)
# ══════════════════════════════════════════════════════════

MODEL_EXISTS = os.path.exists(
    os.path.join(os.path.dirname(__file__), "../models/xgb_v1.joblib")
)

@pytest.mark.skipif(not MODEL_EXISTS,
    reason="Run python3 -m app.ml.train first")
def test_predictor_loads():
    from app.ml.predictor import CarPricePredictor
    CarPricePredictor.load()
    assert CarPricePredictor.is_ready()

@pytest.mark.skipif(not MODEL_EXISTS, reason="Model not trained yet")
def test_predict_returns_positive_price():
    from app.ml.predictor import CarPricePredictor
    CarPricePredictor.load()
    result = CarPricePredictor.predict(SAMPLE_CAR)
    assert result["predicted_price_usd"] > 0

@pytest.mark.skipif(not MODEL_EXISTS, reason="Model not trained yet")
def test_predict_confidence_band_ordered():
    from app.ml.predictor import CarPricePredictor
    CarPricePredictor.load()
    result = CarPricePredictor.predict(SAMPLE_CAR)
    assert result["confidence_low_usd"] <= result["predicted_price_usd"]
    assert result["predicted_price_usd"] <= result["confidence_high_usd"]

@pytest.mark.skipif(not MODEL_EXISTS, reason="Model not trained yet")
def test_older_car_cheaper_than_newer():
    """A 2018 car should predict lower price than same 2023 spec."""
    from app.ml.predictor import CarPricePredictor
    CarPricePredictor.load()
    old = CarPricePredictor.predict({**SAMPLE_CAR, "year": 2018})
    new = CarPricePredictor.predict({**SAMPLE_CAR, "year": 2023})
    assert old["predicted_price_usd"] < new["predicted_price_usd"], (
        "Older cars should predict lower prices"
    )