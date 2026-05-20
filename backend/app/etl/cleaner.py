import re, logging
import pandas as pd
import numpy as np
from sqlalchemy import text, update
from app.database import engine, SessionLocal
from app.models.car_listings import CarListing

logger = logging.getLogger(__name__)

VALID_FUELS = {"petrol", "diesel", "hybrid", "electric"}
VALID_TRANS = {"automatic", "manual", "cvt"}

FUEL_MAP = {
    "gasoline": "petrol", "gas": "petrol",  "benzine": "petrol",
    "petrol":   "petrol", "diesel": "diesel","hybrid":  "hybrid",
    "phev":     "hybrid", "hev":    "hybrid","electric":"electric",
    "ev":       "electric","bev":   "electric",
}

MAKE_CORRECTIONS = {
    "TOYOTA":    "Toyota",  "toyota":  "Toyota",
    "HONDA":     "Honda",   "honda":   "Honda",
    "NISSAN":    "Nissan",  "SUBARU":  "Subaru",
    "MAZDA":     "Mazda",   "SUZUKI":  "Suzuki",
    "MITSUBISHI":"Mitsubishi","DAIHATSU":"Daihatsu",
}

MODEL_ALIASES = {
    "vitz":     "Yaris",  "starlet": "Yaris",
    "wish":     "Wish",   "harrier": "Harrier",
    "demio":    "Demio",  "atenza":  "Atenza",
    "axela":    "Axela",
}


class ListingCleaner:
    def __init__(self, chunk_size: int = 500):
        self.chunk_size = chunk_size

    def run(self) -> dict:
        stats = {"fetched": 0, "cleaned": 0, "dropped": 0, "errors": 0}

        with engine.connect() as conn:
            total = conn.execute(
                text("SELECT COUNT(*) FROM car_listings WHERE is_cleaned = false")
            ).scalar()

        logger.info("Cleaning %d raw records in chunks of %d", total, self.chunk_size)
        stats["fetched"] = total

        for offset in range(0, total, self.chunk_size):
            df = pd.read_sql(
                f"SELECT * FROM car_listings WHERE is_cleaned = false "
                f"LIMIT {self.chunk_size} OFFSET {offset}",
                engine,
            )
            if df.empty:
                break

            cleaned, dropped = self._process_chunk(df)
            stats["cleaned"] += len(cleaned)
            stats["dropped"] += dropped

            if not cleaned.empty:
                self._write_back(cleaned)

        logger.info("ETL complete: %s", stats)
        return stats

    def _process_chunk(self, df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
        original = len(df)

        df = self._standardize_make_model(df)
        df = self._normalize_categoricals(df)
        df = self._fix_numeric_fields(df)
        df = self._filter_invalid_rows(df)
        df = self._remove_outliers(df)

        df["is_cleaned"] = True
        dropped = original - len(df)
        return df, dropped

    def _standardize_make_model(self, df: pd.DataFrame) -> pd.DataFrame:
        df["make"]  = df["make"].str.strip().replace(MAKE_CORRECTIONS)
        df["make"]  = df["make"].str.title()
        df["model"] = df["model"].str.strip().str.title()
        df["model"] = df["model"].str.lower().replace(MODEL_ALIASES).str.title()
        return df

    def _normalize_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        df["fuel_type"] = (
            df["fuel_type"]
            .str.lower().str.strip()
            .map(FUEL_MAP)
            .fillna("petrol")
        )
        df["transmission"] = (
            df["transmission"].str.lower().str.strip()
            .map({"at": "automatic", "mt": "manual", "cvt": "cvt",
                  "automatic": "automatic", "manual": "manual"})
            .fillna("automatic")
        )
        df["body_type"] = df["body_type"].str.lower().str.strip().fillna("unknown")
        return df

    def _fix_numeric_fields(self, df: pd.DataFrame) -> pd.DataFrame:
        df["price_usd"]   = pd.to_numeric(df["price_usd"],   errors="coerce")
        df["mileage_km"]  = pd.to_numeric(df["mileage_km"],  errors="coerce").abs()
        df["engine_cc"]   = pd.to_numeric(df["engine_cc"],   errors="coerce")
        df["year"]        = pd.to_numeric(df["year"],         errors="coerce").astype("Int64")

        # Convert engine if stored in litres
        df.loc[df["engine_cc"] < 10, "engine_cc"] *= 1000
        # Fill missing engine_cc with group median
        df["engine_cc"] = df.groupby(["make", "model"])["engine_cc"].transform(
            lambda x: x.fillna(x.median())
        )
        df["engine_cc"] = df["engine_cc"].fillna(1500).astype(int)
        return df

    def _filter_invalid_rows(self, df: pd.DataFrame) -> pd.DataFrame:
        before = len(df)
        df = df.dropna(subset=["make", "model", "year", "price_usd"])
        df = df[
            (df["year"] >= 2018) &
            (df["year"] <= 2025) &
            (df["price_usd"] > 300) &
            (df["price_usd"] < 200_000) &
            (df["mileage_km"].isna() | (df["mileage_km"] < 500_000)) &
            (df["make"].str.len() >= 2)
        ]
        logger.debug("Filter: %d → %d rows", before, len(df))
        return df

    def _remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """IQR outlier removal scoped per make+model+year group."""
        def iqr_filter(grp):
            if len(grp) < 5:            # too small to IQR — keep all
                return grp
            q1, q3 = grp["price_usd"].quantile([0.25, 0.75])
            iqr    = q3 - q1
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            return grp[(grp["price_usd"] >= lo) & (grp["price_usd"] <= hi)]

        return df.groupby(["make", "model", "year"], group_keys=False).apply(iqr_filter)

    def _write_back(self, df: pd.DataFrame):
        db = SessionLocal()
        try:
            for _, row in df.iterrows():
                db.query(CarListing).filter_by(id=int(row["id"])).update({
                    "make":         row["make"],
                    "model":        row["model"],
                    "fuel_type":    row["fuel_type"],
                    "transmission": row["transmission"],
                    "body_type":    row["body_type"],
                    "engine_cc":    int(row["engine_cc"]),
                    "is_cleaned":   True,
                })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Write-back error: %s", e)
        finally:
            db.close()
