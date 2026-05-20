"""
backend/app/ml/features.py

Feature engineering for car price prediction.
Used by both training (train.py) and inference (predictor.py).
"""

import numpy as np
import pandas as pd
pd.set_option('future.no_silent_downcasting', True)
from sklearn.preprocessing import OrdinalEncoder

CURRENT_YEAR = 2025

# Feature columns in exact order expected by the model
FEATURE_COLS = [
    "car_age", "log_mileage", "engine_cc",
    "make", "model", "fuel_type", "transmission", "body_type", "source",
]

# Default values for missing fields
DEFAULTS = {
    "mileage_km": 0,
    "engine_cc": 1500,
    "fuel_type": "petrol",
    "transmission": "automatic",
    "body_type": "sedan",
    "source": "beforward",
}

CATEGORICAL_COLS = ["make", "model", "fuel_type", "transmission", "body_type", "source"]


def engineer_features(df: pd.DataFrame, source: str = "beforward") -> pd.DataFrame:
    """
    Transform raw car data into model-ready features.

    Args:
        df: DataFrame with columns: make, model, year, mileage_km, engine_cc,
            fuel_type, transmission, body_type
        source: Platform source (beforward, peachcars, etc.)

    Returns:
        DataFrame with FEATURE_COLS in exact order, no nulls.
    """
    df = df.copy()

    # Numeric features
    df["car_age"] = CURRENT_YEAR - df["year"].astype(int)
    df["log_mileage"] = np.log1p(df["mileage_km"].astype(float).fillna(float(DEFAULTS["mileage_km"])).astype(float))
    df["engine_cc"] = df["engine_cc"].astype(float).fillna(float(DEFAULTS["engine_cc"]))

    # Categorical cleaning
    df["make"] = df["make"].astype(str).str.title().str.strip()
    df["model"] = df["model"].astype(str).str.strip()
    df["fuel_type"] = df["fuel_type"].astype(str).str.lower().str.strip()
    df["transmission"] = df["transmission"].astype(str).str.lower().str.strip()
    df["body_type"] = df["body_type"].fillna(DEFAULTS["body_type"]).astype(str).str.lower().str.strip()
    df["source"] = source

    # Ensure all feature columns exist and ordered
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = DEFAULTS.get(col, "unknown")

    return df[FEATURE_COLS]


def fit_encoder(df: pd.DataFrame) -> OrdinalEncoder:
    """Fit OrdinalEncoder on categorical columns."""
    enc = OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=-1,
        dtype=np.int32,
    )
    enc.fit(df[CATEGORICAL_COLS].astype(str))
    return enc


def apply_encoder(df: pd.DataFrame, encoder: OrdinalEncoder) -> pd.DataFrame:
    """Apply fitted encoder to categorical columns."""
    df = df.copy()
    df[CATEGORICAL_COLS] = encoder.transform(df[CATEGORICAL_COLS].astype(str))
    return df


def prepare_for_model(df: pd.DataFrame, encoder: OrdinalEncoder) -> pd.DataFrame:
    """Full pipeline: engineer + encode."""
    df = engineer_features(df)
    return apply_encoder(df, encoder)
