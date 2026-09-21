from app.config import sources
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from decimal import Decimal
from typing import Optional
from sqlalchemy import select, func, and_, text
from pydantic import BaseModel
from datetime import datetime
from app.dependencies import DBDep, PaginationDep, cache
from app.models.car_listings import CarListing
from app.models.local_listings import LocalListing
from app.config import IMPORT_SOURCES, LOCAL_SOURCES, ALL_SOURCES, settings

router = APIRouter(prefix="/api/listings", tags=["listings"])


class ListingOut(BaseModel):
    id: int
    source: str
    make: str
    model: str
    year: int
    mileage_km: Optional[int] = None
    engine_cc: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    body_type: Optional[str] = None
    color: Optional[str] = None
    auction_grade: Optional[str] = None
    location_jp: Optional[str] = None
    images: Optional[str] = None
    price_usd: Optional[float] = None
    price_kes: Optional[float] = None
    url: Optional[str] = None
    status: Optional[str] = "active"
    scraped_at: Optional[datetime] = None

    class Config:
        from_attributes = True



def _serialize_row(row):
    """Convert SQLAlchemy row mapping to JSON-safe dict."""
    d = dict(row)
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, Decimal):
            d[k] = float(v)
    return d


@router.get("/")
def get_listings(
    db: DBDep,
    pagination: PaginationDep,
    source: Optional[str] = Query(
        None,
        description=f"Filter by source: {', '.join(ALL_SOURCES)}, or all",
        regex=f"^(all|{'|'.join(ALL_SOURCES)})$"
    ),
    make: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    year_min: int = Query(2018),
    year_max: int = Query(2026),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    fuel_type: Optional[str] = Query(None),
    body_type: Optional[str] = Query(None),
    status: Optional[str] = Query("active", description="Filter by status: active (default), sold, removed, or all"),
    sort_by: str = Query("price_usd", regex="^(price_usd|year|mileage_km|scraped_at|id)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
):
    try:
        source_lower = source.lower() if source else None
        cache_key = f"listings:{source}:{make}:{model}:{year_min}:{year_max}:{price_min}:{price_max}:{fuel_type}:{body_type}:{status}:{sort_by}:{sort_order}:{pagination.page}:{pagination.page_size}"
        cached = cache.get(cache_key)
        if cached:
            return JSONResponse(content=cached["rows"],
                                headers={"X-Total-Count": str(cached["total"])})

        # Base filters
        status_filter = f"status = '{status.lower()}'" if status and status.lower() != "all" else "1=1"
        make_filter = f"AND LOWER(make) LIKE LOWER('%{make}%')" if make else ""
        model_filter = f"AND LOWER(model) LIKE LOWER('%{model}%')" if model else ""
        year_filter = f"AND year >= {year_min} AND year <= {year_max}"
        fuel_filter = f"AND LOWER(fuel_type) = '{fuel_type.lower()}'" if fuel_type else ""
        body_filter = f"AND LOWER(body_type) = '{body_type.lower()}'" if body_type else ""
        price_filter_import = f"AND price_usd >= {price_min}" if price_min else ""
        if price_max: price_filter_import += f" AND price_usd <= {price_max}"

        usd_rate = settings.usd_kes_fallback

        query_parts = []

        # Part 1: CarListing (beforward, sbt)
        if not source_lower or source_lower in IMPORT_SOURCES:
            src_cond = (
                f"AND source = '{source_lower}'"
                if source_lower and source_lower in IMPORT_SOURCES
                else ""
            )

            query_parts.append(f"""
                SELECT id, source, make, model, year, mileage_km, engine_cc, fuel_type, transmission, body_type,
                       price_usd, ROUND((price_usd * {usd_rate})::numeric, 0) as price_kes, url, status, scraped_at, images
                FROM car_listings
                WHERE is_cleaned = true AND {status_filter} {src_cond} {make_filter} {model_filter} {year_filter} {fuel_filter} {body_filter} {price_filter_import}
            """)

        # Part 2: LocalListing (peachcars)
        if not source_lower or source_lower in LOCAL_SOURCES:
            src_cond = (
                f"AND source = '{source_lower}'"
                if source_lower and source_lower in LOCAL_SOURCES
                else ""
            )

            price_filter_local = (
                f"AND (price_kes / {usd_rate}) >= {price_min}"
                if price_min else ""
            )
            if price_max:
                price_filter_local += f" AND (price_kes / {usd_rate}) <= {price_max}"

            query_parts.append(f"""
                SELECT id, source, make, model, year, mileage_km, engine_cc, fuel_type, transmission, body_type,
                       ROUND((price_kes / {usd_rate})::numeric, 0) as price_usd, price_kes, listing_url as url, status, scraped_at, images_json as images
                FROM local_listings
                WHERE {status_filter} {src_cond} {make_filter} {model_filter} {year_filter} {fuel_filter} {body_filter} {price_filter_local}
            """)

        union_sql = " UNION ALL ".join(query_parts)

        count_sql = f"SELECT COUNT(*) FROM ({union_sql}) combined"
        total = db.execute(text(count_sql)).scalar()

        order_clause = f"ORDER BY {sort_by} {'ASC' if sort_order == 'asc' else 'DESC'} NULLS LAST"
        limit_clause = f"OFFSET {pagination.offset} LIMIT {pagination.page_size}"

        full_sql = f"SELECT * FROM ({union_sql}) combined {order_clause} {limit_clause}"
        rows = db.execute(text(full_sql)).mappings().all()

        rows_list = [_serialize_row(r) for r in rows]
        cache.set(cache_key, {"rows": rows_list, "total": total})

        return JSONResponse(
            content=rows_list,
            headers={"X-Total-Count": str(total), "X-Page": str(pagination.page)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-cache")
def clear_listings_cache():
    cache.clear()
    return {"status": "success", "message": "Listings cache cleared"}


# ── GET /api/listings/meta/makes — unique makes across all sources ──────
@router.get("/meta/makes")
def get_makes(db: DBDep):
    cached = cache.get("meta:makes")
    if cached:
        return cached

    sql = """
        SELECT make, SUM(n) as count FROM (
            SELECT make, COUNT(*) as n FROM car_listings WHERE is_cleaned = true AND status = 'active' GROUP BY make
            UNION ALL
            SELECT make, COUNT(*) as n FROM local_listings WHERE status = 'active' GROUP BY make
        ) combined
        WHERE make IS NOT NULL AND make != ''
        GROUP BY make
        ORDER BY SUM(n) DESC
    """
    rows = db.execute(text(sql)).mappings().all()
    result = [{"make": r["make"], "count": int(r["count"])} for r in rows]
    cache.set("meta:makes", result)
    return result


# ── GET /api/listings/meta/models?make=Toyota ─────────────────────────────
@router.get("/meta/models")
def get_models(make: str = Query(...), db: DBDep = None):
    cached = cache.get(f"meta:models:{make}")
    if cached:
        return cached

    sql = f"""
        SELECT model, SUM(n) as count FROM (
            SELECT model, COUNT(*) as n FROM car_listings WHERE is_cleaned = true AND status = 'active' AND LOWER(make) LIKE LOWER('%{make}%') GROUP BY model
            UNION ALL
            SELECT model, COUNT(*) as n FROM local_listings WHERE status = 'active' AND LOWER(make) LIKE LOWER('%{make}%') GROUP BY model
        ) combined
        WHERE model IS NOT NULL AND model != ''
        GROUP BY model
        ORDER BY SUM(n) DESC
    """
    rows = db.execute(text(sql)).mappings().all()
    result = [{"model": r["model"], "count": int(r["count"])} for r in rows]
    cache.set(f"meta:models:{make}", result)
    return result


# ── GET /api/listings/{id} ────────────────────────────────────────────────
@router.get("/{listing_id}")
def get_listing(listing_id: int, db: DBDep):
    row = db.get(CarListing, listing_id)
    if not row:
        row = db.get(LocalListing, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")

    d = _serialize_row(row.__dict__ if hasattr(row, '__dict__') else row)
    d.pop('_sa_instance_state', None)

    usd_rate = settings.usd_kes_fallback
    if d.get("price_usd") and not d.get("price_kes"):
        d["price_kes"] = round(d["price_usd"] * usd_rate)
    elif d.get("price_kes") and not d.get("price_usd"):
        d["price_usd"] = round(d["price_kes"] / usd_rate)

    if hasattr(row, 'listing_url') and not d.get('url'):
        d['url'] = getattr(row, 'listing_url', None)

    if hasattr(row, 'images_json') and not d.get('images'):
        d['images'] = getattr(row, 'images_json', None)

    return d
