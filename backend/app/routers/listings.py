from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from datetime import datetime
from app.dependencies import DBDep, PaginationDep, cache
from app.models.car_listings import CarListing

router = APIRouter(prefix="/api/listings", tags=["listings"])


# ── Pydantic response schema ──────────────────────────────────────────────
class ListingOut(BaseModel):
    id:           int
    source:       str
    make:         str
    model:        str
    year:         int
    mileage_km:   Optional[int]
    engine_cc:    Optional[int]
    fuel_type:    Optional[str]
    transmission: Optional[str]
    body_type:    Optional[str]
    price_usd:    Optional[float]
    url:          Optional[str]
    scraped_at:   datetime

    class Config:
        from_attributes = True


# ── GET /api/listings/ ────────────────────────────────────────────────────
@router.get("/", response_model=list[ListingOut])
def get_listings(
    db:          DBDep,
    pagination:  PaginationDep,
    make:        Optional[str]   = Query(None),
    model:       Optional[str]   = Query(None),
    year_min:    int             = Query(2018),
    year_max:    int             = Query(2026),
    price_min:   Optional[float] = Query(None),
    price_max:   Optional[float] = Query(None),
    fuel_type:   Optional[str]   = Query(None),
    body_type:   Optional[str]   = Query(None),
    sort_by:     str             = Query("price_usd", regex="^(price_usd|year|mileage_km|scraped_at)$"),
    sort_order:  str             = Query("asc",       regex="^(asc|desc)$"),
):
    """
    Paginated, filtered car listings from BE FORWARD.

    Optimisations:
    - select() with explicit columns avoids loading raw_data (up to 2KB per row)
    - Filters applied at DB level, not in Python
    - Total count returned as X-Total-Count header for frontend pagination
    - Results cached per unique filter combination for 10 min
    """
    cache_key = f"listings:{make}:{model}:{year_min}:{year_max}:{price_min}:{price_max}:{fuel_type}:{body_type}:{sort_by}:{sort_order}:{pagination.page}:{pagination.page_size}"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(content=cached["rows"],
                            headers={"X-Total-Count": str(cached["total"])})

    # ── Build query — project only needed columns ──────────────────────
    cols = [
        CarListing.id, CarListing.source, CarListing.make, CarListing.model,
        CarListing.year, CarListing.mileage_km, CarListing.engine_cc,
        CarListing.fuel_type, CarListing.transmission, CarListing.body_type,
        CarListing.price_usd, CarListing.url, CarListing.scraped_at,
    ]

    filters = [
        CarListing.is_cleaned == True,
        CarListing.source     == "beforward",
        CarListing.year       >= year_min,
        CarListing.year       <= year_max,
    ]
    if make:      filters.append(CarListing.make.ilike(f"%{make}%"))
    if model:     filters.append(CarListing.model.ilike(f"%{model}%"))
    if price_min: filters.append(CarListing.price_usd >= price_min)
    if price_max: filters.append(CarListing.price_usd <= price_max)
    if fuel_type: filters.append(CarListing.fuel_type == fuel_type.lower())
    if body_type: filters.append(CarListing.body_type == body_type.lower())

    sort_col = getattr(CarListing, sort_by)
    order    = sort_col.asc() if sort_order == "asc" else sort_col.desc()

    total = db.execute(
        select(func.count()).select_from(CarListing).where(and_(*filters))
    ).scalar()

    rows = db.execute(
        select(*cols).where(and_(*filters))
        .order_by(order)
        .offset(pagination.offset)
        .limit(pagination.page_size)
    ).mappings().all()

    rows_list = [dict(r) for r in rows]
    cache.set(cache_key, {"rows": rows_list, "total": total})

    return JSONResponse(
        content=rows_list,
        headers={"X-Total-Count": str(total), "X-Page": str(pagination.page)},
    )


# ── GET /api/listings/{id} ────────────────────────────────────────────────
@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: DBDep):
    row = db.get(CarListing, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    return row


# ── GET /api/listings/meta/makes — unique makes for filter dropdowns ──────
@router.get("/meta/makes")
def get_makes(db: DBDep):
    cached = cache.get("meta:makes")
    if cached:
        return cached
    rows = db.execute(
        select(CarListing.make, func.count().label("n"))
        .where(CarListing.is_cleaned == True, CarListing.source == "beforward")
        .group_by(CarListing.make)
        .order_by(func.count().desc())
    ).all()
    result = [{"make": r.make, "count": r.n} for r in rows]
    cache.set("meta:makes", result)
    return result


# ── GET /api/listings/meta/models?make=Toyota ─────────────────────────────
@router.get("/meta/models")
def get_models(make: str = Query(...), db: DBDep = None):
    cached = cache.get(f"meta:models:{make}")
    if cached:
        return cached
    rows = db.execute(
        select(CarListing.model, func.count().label("n"))
        .where(
            CarListing.is_cleaned == True,
            CarListing.source     == "beforward",
            CarListing.make.ilike(f"%{make}%"),
        )
        .group_by(CarListing.model)
        .order_by(func.count().desc())
    ).all()
    result = [{"model": r.model, "count": r.n} for r in rows]
    cache.set(f"meta:models:{make}", result)
    return result
