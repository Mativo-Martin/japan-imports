import pandas as pd
from app.database import engine

def quality_report() -> dict:
    df = pd.read_sql(
        "SELECT * FROM car_listings WHERE is_cleaned = true", engine)

    if df.empty:
        return {"error": "No cleaned data yet"}

    report = {
        "total_records":  len(df),
        "sources":        df["source"].value_counts().to_dict(),
        "makes":          df["make"].nunique(),
        "models":         df["model"].nunique(),
        "year_range":     [int(df["year"].min()), int(df["year"].max())],
        "price_range_usd":[round(df["price_usd"].min(), 2),
                           round(df["price_usd"].max(), 2)],
        "price_mean_usd": round(df["price_usd"].mean(), 2),
        "mileage_mean_km":round(df["mileage_km"].mean(), 0),
        "null_rates": {
            col: round(df[col].isna().mean() * 100, 1)
            for col in ["price_usd", "engine_cc", "fuel_type", "transmission",
                        "body_type", "mileage_km"]
        },
        "fuel_dist":  df["fuel_type"].value_counts(normalize=True).round(3).to_dict(),
        "trans_dist": df["transmission"].value_counts(normalize=True).round(3).to_dict(),
    }

    # assertions — fail loud if something is wrong
    assert report["total_records"] > 100, "Too few records — scraping may have failed"
    assert report["null_rates"]["price_usd"] == 0, "Null prices in cleaned data!"
    assert report["year_range"][0] >= 2018, "Pre-2018 cars slipped through"

    return report

if __name__ == "__main__":
    import json
    print(json.dumps(quality_report(), indent=2))
