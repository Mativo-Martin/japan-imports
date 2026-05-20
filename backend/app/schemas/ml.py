"""
backend/app/schemas/ml.py

Pydantic schemas for ML prediction API.
"""

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    make: str = Field(..., example="Toyota")
    model_name: str = Field(..., example="Corolla")
    year: int = Field(..., ge=1980, le=2030, example=2019)
    mileage_km: int = Field(0, ge=0, example=45000)
    engine_cc: int = Field(1500, ge=500, le=8000, example=1800)
    fuel_type: str = Field("petrol", example="petrol")
    transmission: str = Field("automatic", example="automatic")
    body_type: str = Field("sedan", example="sedan")
    source: str = Field("beforward", example="beforward")


class PredictResponse(BaseModel):
    predicted_price_usd: float
    confidence: str
    flags: list[str]
    input: dict


class BatchPredictRequest(BaseModel):
    records: list[PredictRequest]


class BatchPredictResponse(BaseModel):
    predictions: list[PredictResponse]
    count: int


class ModelMetrics(BaseModel):
    model_tag: str
    mae: float
    rmse: float
    r2: float
    mape: float
    n_train: int
    n_test: int
    feature_importance: dict[str, float] | None = None
