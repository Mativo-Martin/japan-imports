import statistics
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.local_listings import LocalListing
from app.models.car_listings   import CarListing
from app.calculator.kra       import calculate_import_cost
from app.config import IMPORT_SOURCES

def compare_import_vs_local(
    make: str,
    model: str,
    year: int,
    db: Session,
    usd_kes: float = 130.0,
) -> dict:
    """
    Returns import cost range vs local market range.
    
    Year logic:
    - Exact match on requested year (dynamic, no hardcoded tolerance)
    - Minimum year 2018 for Japan imports (KRA restriction)
    - No maximum year cap
    - Falls back to nearest available years if exact match is empty
    """

    # --- Shared base filters (case-insensitive partial match) ---
    japan_base = [
        CarListing.source.in_(IMPORT_SOURCES),
        CarListing.make.ilike(f"%{make}%"),
        CarListing.model.ilike(f"%{model}%"),
        CarListing.is_cleaned == True,
        CarListing.price_usd.isnot(None),
        CarListing.year >= 2018,          # ← min year restriction
        # NO upper year cap
    ]

    local_base = [
        LocalListing.make.ilike(f"%{make}%"),
        LocalListing.model.ilike(f"%{model}%"),
        LocalListing.price_kes.isnot(None),
    ]

    # --- Japan: exact year first ---
    japan_exact = (
        db.query(CarListing)
        .filter(*japan_base, CarListing.year == year)
        .order_by(CarListing.price_usd)
        .limit(20)
        .all()
    )

    # Fallback: nearest years (still >= 2018, no upper cap)
    japan_listings = japan_exact or (
        db.query(CarListing)
        .filter(*japan_base)
        .order_by(func.abs(CarListing.year - year), CarListing.price_usd)
        .limit(20)
        .all()
    )

    # --- Local: exact year first ---
    local_exact = (
        db.query(LocalListing)
        .filter(*local_base, LocalListing.year == year)
        .all()
    )

    local_listings = local_exact or (
        db.query(LocalListing)
        .filter(*local_base)
        .order_by(func.abs(LocalListing.year - year))
        .limit(20)
        .all()
    )

    def calc(listing) -> float:
        cost = calculate_import_cost(
            purchase_usd=listing.price_usd,
            body_type=listing.body_type or "sedan",
            usd_kes=usd_kes,
        )
        return cost.total_import_kes

    # Build import stats
    if japan_listings:
        import_prices = [calc(l) for l in japan_listings]
        import_data = {
            "count":             len(japan_listings),
            "min_kes":           round(min(import_prices)),
            "max_kes":           round(max(import_prices)),
            "median_kes":        round(statistics.median(import_prices)),
            "best_listing_id":   japan_listings[0].id,
            "best_purchase_usd": japan_listings[0].price_usd,
        }
    else:
        import_data = {
            "count": 0, "min_kes": None, "max_kes": None,
            "median_kes": None, "best_listing_id": None,
            "best_purchase_usd": None,
        }

    # Build local stats
    if local_listings:
        local_prices = [l.price_kes for l in local_listings]
        local_data = {
            "count":      len(local_listings),
            "min_kes":    round(min(local_prices)),
            "max_kes":    round(max(local_prices)),
            "median_kes": round(statistics.median(local_prices)),
        }
    else:
        local_data = {
            "count": 0, "min_kes": None, "max_kes": None,
            "median_kes": None,
        }

    result = {
        "make": make, "model": model, "year": year,
        "import": import_data,
        "local": local_data,
    }

    # Verdict only when both sides have data
    if japan_listings and local_listings:
        median_local  = statistics.median([l.price_kes for l in local_listings])
        median_import = statistics.median(import_prices)
        saving = round(median_local - median_import)
        pct    = round(saving / median_local * 100, 1) if median_local else 0.0

        result["saving_kes"] = saving
        result["saving_pct"] = abs(pct)
        result["verdict"]    = "import" if saving > 0 else "local"
        result["verdict_summary"] = (
            f"Importing saves ~KES {saving:,} ({abs(pct)}% cheaper than local)"
            if saving > 0
            else f"Local market is ~KES {abs(saving):,} cheaper"
        )
    else:
        result["saving_kes"] = None
        result["saving_pct"] = None
        result["verdict"]    = (
            "no_local_data" if not local_listings else "no_import_data"
        )
        result["verdict_summary"] = (
            "No local market data for this spec"
            if not local_listings
            else "No Japan import listings for this spec"
        )

    return result