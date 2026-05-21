from fastapi import APIRouter, Query
from sqlalchemy import text
from app.dependencies import DBDep, cache

router = APIRouter(prefix="/api/stats", tags=["stats"])

IMPORT_SOURCES = ("'beforward'", "'sbt'")


@router.get("/overview")
def overview(db: DBDep):
    cached = cache.get("stats:overview")
    if cached is not None:
        return cached

    sources_sql = ",".join(IMPORT_SOURCES)

    result = db.execute(text(f"""
        WITH bf AS (
            SELECT price_usd, make, model, year, fuel_type, mileage_km
            FROM   car_listings
            WHERE  source IN ({sources_sql}) AND is_cleaned = true
              AND  price_usd IS NOT NULL
        ),
        local AS (
            SELECT price_kes
            FROM   local_listings
            WHERE  source = 'peachcars'
        )
        SELECT
            (SELECT COUNT(*)           FROM bf)                        AS bf_count,
            (SELECT ROUND(AVG(price_usd)::numeric,0) FROM bf)         AS bf_avg_usd,
            (SELECT ROUND(MIN(price_usd)::numeric,0) FROM bf)         AS bf_min_usd,
            (SELECT ROUND(MAX(price_usd)::numeric,0) FROM bf)         AS bf_max_usd,
            (SELECT COUNT(*)           FROM local)                     AS local_count,
            (SELECT ROUND(AVG(price_kes)::numeric,0) FROM local)      AS local_avg_kes,
            (SELECT COUNT(DISTINCT make) FROM bf)                     AS unique_makes,
            (SELECT COUNT(DISTINCT model) FROM bf)                    AS unique_models
    """)).mappings().one()

    data = dict(result)
    cache.set("stats:overview", data)
    return data


@router.get("/price-distribution")
def price_distribution(db: DBDep):
    cached = cache.get("stats:price-dist")
    if cached is not None:
        return cached

    sources_sql = ",".join(IMPORT_SOURCES)

    rows = db.execute(text(f"""
        SELECT
            CASE
                WHEN price_usd <  3000  THEN 'Under $3k'
                WHEN price_usd <  6000  THEN '$3k–$6k'
                WHEN price_usd <  10000 THEN '$6k–$10k'
                WHEN price_usd <  15000 THEN '$10k–$15k'
                WHEN price_usd <  25000 THEN '$15k–$25k'
                ELSE 'Over $25k'
            END AS band,
            COUNT(*) AS count
        FROM car_listings
        WHERE source IN ({sources_sql}) AND is_cleaned = true
          AND price_usd IS NOT NULL
        GROUP BY band
        ORDER BY MIN(price_usd)
    """)).mappings().all()

    result = [dict(r) for r in rows]
    cache.set("stats:price-dist", result)
    return result


@router.get("/top-makes")
def top_makes(limit: int = Query(10, le=20), db: DBDep = None):
    cached = cache.get(f"stats:top-makes:{limit}")
    if cached is not None:
        return cached

    sources_sql = ",".join(IMPORT_SOURCES)

    rows = db.execute(text(f"""
        SELECT
            make,
            COUNT(*)                             AS count,
            ROUND(AVG(price_usd)::numeric, 0)   AS avg_price_usd,
            ROUND(MIN(price_usd)::numeric, 0)   AS min_price_usd
        FROM car_listings
        WHERE source IN ({sources_sql}) AND is_cleaned = true
          AND price_usd IS NOT NULL
        GROUP BY make
        ORDER BY count DESC
        LIMIT {limit}
    """)).mappings().all()

    result = [dict(r) for r in rows]
    cache.set(f"stats:top-makes:{limit}", result)
    return result


@router.get("/savings-summary")
async def savings_summary(db: DBDep):
    cached = cache.get("stats:savings")
    if cached is not None:
        return cached

    from app.calculator.exchange import get_usd_kes
    from app.calculator.kra import calculate_import_cost

    rate = await get_usd_kes()
    sources_sql = ",".join(IMPORT_SOURCES)

    rows = db.execute(text(f"""
        SELECT
            bf.make, bf.model, bf.year,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bf.price_usd) AS median_import_usd,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lc.price_kes) AS median_local_kes,
            COUNT(DISTINCT bf.id)  AS import_count,
            COUNT(DISTINCT lc.id)  AS local_count
        FROM car_listings bf
        JOIN local_listings lc
          ON LOWER(lc.make)  = LOWER(bf.make)
         AND LOWER(lc.model) = LOWER(bf.model)
         AND lc.year          = bf.year
        WHERE bf.source IN ({sources_sql}) AND bf.is_cleaned = true
          AND lc.source = 'peachcars'
          AND bf.price_usd IS NOT NULL
          AND lc.price_kes IS NOT NULL
        GROUP BY bf.make, bf.model, bf.year
        HAVING COUNT(DISTINCT bf.id) >= 2
           AND COUNT(DISTINCT lc.id) >= 1
        ORDER BY median_local_kes DESC
        LIMIT 20
    """)).mappings().all()

    result = []
    for r in rows:
        cost = calculate_import_cost(
            purchase_usd=float(r["median_import_usd"]),
            body_type="sedan",
            usd_kes=rate,
        )
        saving = float(r["median_local_kes"]) - cost.total_import_kes
        result.append({
            "make":              r["make"],
            "model":             r["model"],
            "year":              r["year"],
            "median_import_usd": round(float(r["median_import_usd"]), 0),
            "total_landed_kes":  round(cost.total_import_kes, 0),
            "median_local_kes":  round(float(r["median_local_kes"]), 0),
            "saving_kes":        round(saving, 0),
            "saving_pct":        round(saving / float(r["median_local_kes"]) * 100, 1),
            "verdict":           "import" if saving > 0 else "buy_local",
            "import_count":      r["import_count"],
            "local_count":       r["local_count"],
        })

    result.sort(key=lambda x: x["saving_kes"], reverse=True)
    cache.set("stats:savings", result)
    return result


@router.post("/clear-cache")
def clear_cache():
    cache.invalidate("stats:")
    return {"ok": True}