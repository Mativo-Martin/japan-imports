from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.ml.predictor import CarPricePredictor
from app.calculator.kra import calculate_import_cost
from app.calculator.exchange import get_usd_kes

router = APIRouter(prefix="/api/ml", tags=["ml"])


class PredictRequest(BaseModel):
    make:         str   = Field(..., example="Toyota")
    model:        str   = Field(..., example="Vitz")
    year:         int   = Field(..., ge=2018, le=2026, example=2021)
    mileage_km:   Optional[int]   = Field(None, ge=0, example=45000)
    engine_cc:    Optional[int]   = Field(None, ge=500, le=8000, example=1000)
    fuel_type:    Optional[str]   = Field("petrol", example="petrol")
    transmission: Optional[str]   = Field("automatic", example="automatic")
    body_type:    Optional[str]   = Field("hatchback", example="hatchback")
    drive_type:   Optional[str]   = Field(None, example="2wd")
    condition_score: Optional[float] = Field(None, example=4.5)
    source:       Optional[str]   = Field("beforward", example="sbt_japan")


class PredictWithImportRequest(PredictRequest):
    """Predict Japan price AND calculate full KES import cost in one call."""
    include_import_cost: bool = True


class BatchPredictRequest(BaseModel):
    cars: list[PredictRequest] = Field(..., max_items=50)


# ── Single prediction ──────────────────────────────────────────────────────
@router.post("/predict")
def predict_price(req: PredictRequest):
    """
    Predict the Japan market price (USD) for a car with given specs.
    Returns point estimate + ±MAE confidence band.
    """
    if not CarPricePredictor.is_ready():
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Run: python3 -m app.ml.train",
        )
    result = CarPricePredictor.predict(req.model_dump())
    return result


# ── Predict + import cost in one call ─────────────────────────────────────
@router.post("/predict-with-import")
async def predict_with_import(req: PredictWithImportRequest):
    """
    Predict Japan price then immediately calculate full KES import cost.
    Most useful for the frontend comparison view.
    """
    if not CarPricePredictor.is_ready():
        raise HTTPException(status_code=503, detail="Model not loaded")

    ml_result  = CarPricePredictor.predict(req.model_dump())
    usd_kes    = await get_usd_kes()
    import_cost = calculate_import_cost(
        purchase_usd=ml_result["predicted_price_usd"],
        body_type=req.body_type or "hatchback",
        usd_kes=usd_kes,
    )

    return {
        "prediction":   ml_result,
        "import_cost":  import_cost.to_dict(),
        "usd_kes_rate": usd_kes,
        "summary": {
            "predicted_japan_usd": ml_result["predicted_price_usd"],
            "total_landed_kes":    import_cost.total_import_kes,
            "total_landed_usd":    import_cost.total_import_usd,
        },
    }


# ── Batch prediction ───────────────────────────────────────────────────────
@router.post("/predict/batch")
def predict_batch(req: BatchPredictRequest):
    """Predict prices for up to 50 cars at once (for dashboard views)."""
    if not CarPricePredictor.is_ready():
        raise HTTPException(status_code=503, detail="Model not loaded")
    results = []
    for car in req.cars:
        try:
            results.append(CarPricePredictor.predict(car.model_dump()))
        except Exception as e:
            results.append({"error": str(e), "input": car.model_dump()})
    return {"predictions": results, "count": len(results)}


# ── Model info ─────────────────────────────────────────────────────────────
@router.get("/model-info")
def model_info():
    """Return model metadata: MAE, R², training size, features."""
    return CarPricePredictor.model_info()