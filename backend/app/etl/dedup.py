import pandas as pd
from app.database import engine, SessionLocal
from app.models.car_listings import CarListing
import logging

logger = logging.getLogger(__name__)

def find_cross_source_duplicates() -> pd.DataFrame:
    """
    A car listed on two platforms will have the same:
    make + model + year + mileage_km (within ±500 km) + price_usd (within ±$200).
    Flag the newer/cheaper duplicate to keep.
    """
    df = pd.read_sql(
        "SELECT id, source, make, model, year, mileage_km, price_usd, scraped_at "
        "FROM car_listings WHERE is_cleaned = true",
        engine,
    )
    if df.empty:
        return pd.DataFrame()

    df = df.sort_values("price_usd")
    duplicates = []

    for _, row in df.iterrows():
        matches = df[
            (df["make"]  == row["make"])  &
            (df["model"] == row["model"]) &
            (df["year"]  == row["year"])  &
            (df["source"] != row["source"]) &
            ((df["mileage_km"] - row["mileage_km"]).abs() < 500) &
            ((df["price_usd"]  - row["price_usd"]).abs()  < 200) &
            (df["id"] != row["id"])
        ]
        for _, dup in matches.iterrows():
            duplicates.append({
                "keep_id":   row["id"],
                "drop_id":   dup["id"],
                "keep_src":  row["source"],
                "drop_src":  dup["source"],
                "make":      row["make"],
                "model":     row["model"],
                "year":      row["year"],
            })

    return pd.DataFrame(duplicates).drop_duplicates(subset="drop_id") if duplicates else pd.DataFrame()

def mark_duplicates_inactive(dry_run: bool = True) -> int:
    dups = find_cross_source_duplicates()
    if dups.empty:
        logger.info("No cross-source duplicates found")
        return 0
    logger.info("Found %d duplicates", len(dups))
    if dry_run:
        logger.info("Dry-run mode — no changes written")
        return len(dups)

    db = SessionLocal()
    try:
        for drop_id in dups["drop_id"].tolist():
            db.query(CarListing).filter_by(id=drop_id).update({"is_cleaned": False})
        db.commit()
    finally:
        db.close()
    return len(dups)
