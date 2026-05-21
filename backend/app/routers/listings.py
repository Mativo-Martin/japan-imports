from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from datetime import datetime
from app.dependencies import DBDep, PaginationDep, cache
from app.models.car_listings import CarListing

router = APIRouter(prefix="/api/listings", tags=["listings"])


class ListingOut(BaseModel):
    id: int
    source: str
    make: str
    model: str
    year: int
    mileage_km: Optional[int]
    engine_cc: Optional[int]
    fuel_type: Optional[str]
    transmission: Optional[str]
    body_type: Optional[str]
    price_usd: Optional[float]
    url: Optional[str]
    scraped_at: Optional[datetime]  # Changed from datetime to str

    class Config:
        from_attributes = True


def _serialize_row(row):
    """Convert SQLAlchemy row mapping to JSON-safe dict."""
    d = dict(row)
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.get("/")
def get_listings(
    db: DBDep,
    pagination: PaginationDep,
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    year_min: int = Query(2018),
    year_max: int = Query(2026),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    fuel_type: Optional[str] = Query(None),
    body_type: Optional[str] = Query(None),
    sort_by: str = Query("price_usd", regex="^(price_usd|year|mileage_km|scraped_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        cache_key = f"listings:{make}:{model}:{year_min}:{year_max}:{price_min}:{price_max}:{fuel_type}:{body_type}:{sort_by}:{sort_order}:{pagination.page}:{pagination.page_size}"
        cached = cache.get(cache_key)
        if cached:
            return JSONResponse(content=cached["rows"],
                                headers={"X-Total-Count": str(cached["total"])})

        cols = [
            CarListing.id, CarListing.source, CarListing.make, CarListing.model,
            CarListing.year, CarListing.mileage_km, CarListing.engine_cc,
            CarListing.fuel_type, CarListing.transmission, CarListing.body_type,
            CarListing.price_usd, CarListing.url, CarListing.scraped_at,
        ]

        filters = [
            CarListing.is_cleaned == True,
            CarListing.source.in_(["beforward", "sbt"]),  # Include both sources
            CarListing.year >= year_min,
            CarListing.year <= year_max,
        ]
        if make:      filters.append(CarListing.make.ilike(f"%{make}%"))
        if model:     filters.append(CarListing.model.ilike(f"%{model}%"))
        if price_min: filters.append(CarListing.price_usd >= price_min)
        if price_max: filters.append(CarListing.price_usd <= price_max)
        if fuel_type: filters.append(CarListing.fuel_type == fuel_type.lower())
        if body_type: filters.append(CarListing.body_type == body_type.lower())

        sort_col = getattr(CarListing, sort_by)
        order = sort_col.asc() if sort_order == "asc" else sort_col.desc()

        total = db.execute(
            select(func.count()).select_from(CarListing).where(and_(*filters))
        ).scalar()

        rows = db.execute(
            select(*cols).where(and_(*filters))
            .order_by(order)
            .offset(pagination.offset)
            .limit(pagination.page_size)
        ).mappings().all()

        rows_list = [_serialize_row(r) for r in rows]  # Use serializer
        cache.set(cache_key, {"rows": rows_list, "total": total})

        return JSONResponse(
            content=rows_list,
            headers={"X-Total-Count": str(total), "X-Page": str(pagination.page)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

@router.get("/{id}")
def get_listing(id: int, db: DBDep):
    row = db.execute(
        select(CarListing).where(CarListing.id == id)
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _serialize_row(row)
