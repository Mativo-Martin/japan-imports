from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.calculator.kra      import calculate_import_cost
from app.calculator.exchange import get_usd_kes
from app.calculator.compare  import compare_import_vs_local
from app.models.import_estimate import ImportCostEstimate
from datetime import datetime

router = APIRouter(prefix="/api/calculator", tags=["calculator"])

class EstimateRequest(BaseModel):
    purchase_usd:       float = Field(..., gt=0, lt=500_000)
    body_type:          str   = Field("sedan")
    shipping_usd:       Optional[float] = Field(None, gt=0, lt=10_000)
    clearing_agent_kes: float = Field(40_000.0, gt=0)
    listing_id:         Optional[int] = None

class EstimateResponse(BaseModel):
    purchase_usd:          float
    shipping_usd:          float
    cif_usd:               float
    usd_kes_rate:          float
    cif_kes:               float
    customs_duty_kes:      float
    excise_duty_kes:       float
    vat_kes:               float
    idf_levy_kes:          float
    rdl_levy_kes:          float
    port_cfs_kes:          float
    clearing_agent_kes:    float
    ntsa_inspection_kes:   float
    number_plates_kes:     float
    comprehensive_ins_kes: float
    tax_total_kes:         float
    charges_total_kes:     float
    total_import_kes:      float
    total_import_usd:      float

@router.post("/estimate", response_model=EstimateResponse)
async def estimate_import_cost(
    req: EstimateRequest,
    db: Session = Depends(get_db),
):
    rate = await get_usd_kes()
    cost = calculate_import_cost(
        purchase_usd=req.purchase_usd,
        body_type=req.body_type,
        shipping_usd=req.shipping_usd,
        usd_kes=rate,
        clearing_agent_kes=req.clearing_agent_kes,
    )

    if req.listing_id:
        db.add(ImportCostEstimate(
            listing_id=req.listing_id,
            **{k: v for k, v in cost.to_dict().items()
               if k in ImportCostEstimate.__table__.columns.keys()},
            calculated_at=datetime.utcnow(),
        ))
        db.commit()

    return cost.to_dict()

@router.get("/compare")
async def compare_prices(
    make:  str = Query(...),
    model: str = Query(...),
    year:  int = Query(..., ge=2018, le=2030),
    db: Session = Depends(get_db),
):
    rate   = await get_usd_kes()
    result = compare_import_vs_local(make, model, year, db, usd_kes=rate)
    return result

@router.get("/exchange-rate")
async def current_exchange_rate():
    rate = await get_usd_kes()
    return {"usd_kes": round(rate, 4), "source": "open.er-api.com"}
