"""Generate realistic test listings for development."""
import json, logging
from datetime import datetime
from app.database import SessionLocal
from app.models.car_listings import CarListing

logger = logging.getLogger(__name__)

TEST_LISTINGS = [
    {"make": "Toyota", "model": "Yaris", "year": 2023, "price_usd": 12500, "source": "test", "mileage_km": 15000, "engine_cc": 1496, "fuel_type": "petrol", "transmission": "automatic", "body_type": "hatchback"},
    {"make": "Toyota", "model": "Corolla", "year": 2022, "price_usd": 16800, "source": "test", "mileage_km": 22000, "engine_cc": 1798, "fuel_type": "petrol", "transmission": "automatic", "body_type": "sedan"},
    {"make": "Toyota", "model": "Camry", "year": 2021, "price_usd": 24500, "source": "test", "mileage_km": 35000, "engine_cc": 2494, "fuel_type": "petrol", "transmission": "automatic", "body_type": "sedan"},
    {"make": "Honda", "model": "Civic", "year": 2023, "price_usd": 18900, "source": "test", "mileage_km": 12000, "engine_cc": 1496, "fuel_type": "petrol", "transmission": "manual", "body_type": "sedan"},
    {"make": "Honda", "model": "Accord", "year": 2022, "price_usd": 22500, "source": "test", "mileage_km": 28000, "engine_cc": 1993, "fuel_type": "petrol", "transmission": "automatic", "body_type": "sedan"},
    {"make": "Nissan", "model": "Altima", "year": 2021, "price_usd": 19800, "source": "test", "mileage_km": 42000, "engine_cc": 2487, "fuel_type": "petrol", "transmission": "cvt", "body_type": "sedan"},
    {"make": "Nissan", "model": "Qashqai", "year": 2023, "price_usd": 21500, "source": "test", "mileage_km": 18000, "engine_cc": 1997, "fuel_type": "diesel", "transmission": "automatic", "body_type": "suv"},
    {"make": "Mazda", "model": "CX-5", "year": 2022, "price_usd": 23400, "source": "test", "mileage_km": 25000, "engine_cc": 1998, "fuel_type": "petrol", "transmission": "automatic", "body_type": "suv"},
    {"make": "Mazda", "model": "3", "year": 2021, "price_usd": 15600, "source": "test", "mileage_km": 38000, "engine_cc": 1496, "fuel_type": "petrol", "transmission": "automatic", "body_type": "sedan"},
    {"make": "Subaru", "model": "Impreza", "year": 2023, "price_usd": 17800, "source": "test", "mileage_km": 14000, "engine_cc": 1599, "fuel_type": "petrol", "transmission": "cvt", "body_type": "sedan"},
]

def load_test_data(count: int = 10) -> int:
    """Insert test listings. Returns count inserted."""
    db = SessionLocal()
    try:
        inserted = 0
        for i in range(count):
            item = TEST_LISTINGS[i % len(TEST_LISTINGS)]
            existing = db.query(CarListing).filter_by(
                source_id=f"test_{i}"
            ).first()
            if not existing:
                db.add(CarListing(
                    source_id=f"test_{i}",
                    url=f"https://example.com/car/{i}",
                    make=item["make"],
                    model=item["model"],
                    year=item["year"],
                    price_usd=item["price_usd"],
                    mileage_km=item["mileage_km"],
                    engine_cc=item["engine_cc"],
                    fuel_type=item["fuel_type"],
                    transmission=item["transmission"],
                    body_type=item["body_type"],
                    source=item["source"],
                    is_cleaned=False,
                    images=json.dumps([]),
                    raw_data=json.dumps(item),
                ))
                inserted += 1
        db.commit()
        logger.info("Inserted %d test listings", inserted)
        return inserted
    except Exception as e:
        db.rollback()
        logger.error("Failed to load test data: %s", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    load_test_data(count)
    print(f"Loaded {count} test listings")
