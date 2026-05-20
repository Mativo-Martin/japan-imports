import statistics
from sqlalchemy.orm import Session
from app.models.local_listings import LocalListing
from app.models.car_listings   import CarListing
from app.calculator.kra       import calculate_import_cost

def compare_import_vs_local(
    make: str,
    model: str,
    year: int,
    db: Session,
    usd_kes: float = 130.0,
) -> dict:
    """
    Returns import cost range vs local market range,
    potential saving, and best Japan listing for the spec.
    """

    # Best Japan listing for this spec
    japan_listings = (
        db.query(CarListing)
        .filter(
            CarListing.make       == make,
            CarListing.model      == model,
            CarListing.year       == year,
            CarListing.is_cleaned == True,
            CarListing.price_usd.isnot(None),
        )
        .order_by(CarListing.price_usd)
        .limit(20)
        .all()
    )

    # Local Kenya listings for same spec
    local_listings = (
        db.query(LocalListing)
        .filter(
            LocalListing.make  == make,
            LocalListing.model == model,
            LocalListing.year  == year,
            LocalListing.price_kes.isnot(None),
        )
        .all()
    )

    if not japan_listings:
        return {"error": f"No Japan listings found for {make} {model} {year}"}

    # Calculate import cost for cheapest, median, most expensive
    def calc(listing) -> float:
        cost = calculate_import_cost(
            purchase_usd=listing.price_usd,
            body_type=listing.body_type or "sedan",
            usd_kes=usd_kes,
        )
        return cost.total_import_kes

    import_prices = [calc(l) for l in japan_listings]
    local_prices  = [l.price_kes for l in local_listings] if local_listings else []

    result = {
        "make": make, "model": model, "year": year,
        "import": {
            "count":    len(japan_listings),
            "min_kes":  round(min(import_prices)),
            "max_kes":  round(max(import_prices)),
            "median_kes": round(statistics.median(import_prices)),
            "best_listing_id": japan_listings[0].id,
            "best_purchase_usd": japan_listings[0].price_usd,
        },
        "local": {
            "count":      len(local_listings),
            "min_kes":    round(min(local_prices))    if local_prices else None,
            "max_kes":    round(max(local_prices))    if local_prices else None,
            "median_kes": round(statistics.median(local_prices)) if local_prices else None,
        },
    }

    if local_prices:
        saving = round(statistics.median(local_prices) - statistics.median(import_prices))
        pct    = round(saving / statistics.median(local_prices) * 100, 1)
        result["saving_kes"]      = saving
        result["saving_pct"]      = pct
        result["verdict"]         = "import" if saving > 0 else "local"
        result["verdict_summary"] = (
            f"Importing saves ~KES {saving:,} ({pct}% cheaper than local)"
            if saving > 0
            else f"Local market is ~KES {abs(saving):,} cheaper"
        )
    else:
        result["saving_kes"] = None
        result["verdict"]    = "no_local_data"

    return result
