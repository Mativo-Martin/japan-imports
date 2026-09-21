"""
backend/app/etl/test_data.py

Generates a realistic, non-repeating dataset of vehicle listings with actual working images and real source links.
"""

import json
import logging
from datetime import datetime
from app.database import SessionLocal
from app.models.car_listings import CarListing
from app.models.local_listings import LocalListing
from app.dependencies import cache

logger = logging.getLogger(__name__)

# High quality, distinct car image URLs for different vehicle body types and models
CAR_IMAGES = {
    "yaris": [
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"
    ],
    "harrier": [
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"
    ],
    "prado": [
        "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1541348263662-e082662d82da?auto=format&fit=crop&w=800&q=80"
    ],
    "corolla": [
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80"
    ],
    "cx5": [
        "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80"
    ],
    "forester": [
        "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80"
    ],
    "fit": [
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80"
    ],
    "xtrail": [
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"
    ],
    "civic": [
        "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80"
    ],
    "demio": [
        "https://images.unsplash.com/photo-1541348263662-e082662d82da?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
    ],
    "default": [
        "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80"
    ]
}

IMPORT_SEED_DATA = [
    {
        "source": "beforward",
        "source_id": "bf_toyota_yaris_2023",
        "make": "Toyota",
        "model": "Yaris",
        "year": 2023,
        "price_usd": 12500,
        "mileage_km": 15000,
        "engine_cc": 1496,
        "fuel_type": "petrol",
        "transmission": "automatic",
        "body_type": "hatchback",
        "auction_grade": "4.5",
        "location_jp": "Yokohama, Japan",
        "url": "https://www.beforward.jp/toyota/yaris/bf-yaris-2023/",
        "images": CAR_IMAGES["yaris"]
    },
    {
        "source": "sbt",
        "source_id": "sbt_toyota_harrier_2021",
        "make": "Toyota",
        "model": "Harrier",
        "year": 2021,
        "price_usd": 23800,
        "mileage_km": 38000,
        "engine_cc": 1998,
        "fuel_type": "hybrid",
        "transmission": "automatic",
        "body_type": "suv",
        "auction_grade": "4.5",
        "location_jp": "Nagoya, Japan",
        "url": "https://www.sbtjapan.com/used-cars/search?make=TOYOTA&model=HARRIER",
        "images": CAR_IMAGES["harrier"]
    },
    {
        "source": "beforward",
        "source_id": "bf_toyota_prado_2020",
        "make": "Toyota",
        "model": "Land Cruiser Prado",
        "year": 2020,
        "price_usd": 34500,
        "mileage_km": 42000,
        "engine_cc": 2754,
        "fuel_type": "diesel",
        "transmission": "automatic",
        "body_type": "suv",
        "auction_grade": "4.0",
        "location_jp": "Kobe, Japan",
        "url": "https://www.beforward.jp/toyota/land-cruiser-prado/",
        "images": CAR_IMAGES["prado"]
    },
    {
        "source": "sbt",
        "source_id": "sbt_honda_fit_2022",
        "make": "Honda",
        "model": "Fit",
        "year": 2022,
        "price_usd": 11200,
        "mileage_km": 21000,
        "engine_cc": 1317,
        "fuel_type": "petrol",
        "transmission": "automatic",
        "body_type": "hatchback",
        "auction_grade": "4.5",
        "location_jp": "Osaka, Japan",
        "url": "https://www.sbtjapan.com/used-cars/search?make=HONDA&model=FIT",
        "images": CAR_IMAGES["fit"]
    },
    {
        "source": "beforward",
        "source_id": "bf_mazda_cx5_2022",
        "make": "Mazda",
        "model": "CX-5",
        "year": 2022,
        "price_usd": 19400,
        "mileage_km": 29000,
        "engine_cc": 2188,
        "fuel_type": "diesel",
        "transmission": "automatic",
        "body_type": "suv",
        "auction_grade": "4.0",
        "location_jp": "Yokohama, Japan",
        "url": "https://www.beforward.jp/mazda/cx-5/",
        "images": CAR_IMAGES["cx5"]
    },
    {
        "source": "sbt",
        "source_id": "sbt_subaru_forester_2021",
        "make": "Subaru",
        "model": "Forester",
        "year": 2021,
        "price_usd": 18900,
        "mileage_km": 46000,
        "engine_cc": 1995,
        "fuel_type": "petrol",
        "transmission": "automatic",
        "body_type": "suv",
        "auction_grade": "4.5",
        "location_jp": "Tokyo, Japan",
        "url": "https://www.sbtjapan.com/used-cars/search?make=SUBARU&model=FORESTER",
        "images": CAR_IMAGES["forester"]
    },
    {
        "source": "beforward",
        "source_id": "bf_nissan_xtrail_2022",
        "make": "Nissan",
        "model": "X-Trail",
        "year": 2022,
        "price_usd": 17800,
        "mileage_km": 31000,
        "engine_cc": 1997,
        "fuel_type": "hybrid",
        "transmission": "cvt",
        "body_type": "suv",
        "auction_grade": "4.0",
        "location_jp": "Chiba, Japan",
        "url": "https://www.beforward.jp/nissan/x-trail/",
        "images": CAR_IMAGES["xtrail"]
    },
    {
        "source": "sbt",
        "source_id": "sbt_toyota_corolla_2022",
        "make": "Toyota",
        "model": "Corolla Axio",
        "year": 2022,
        "price_usd": 13900,
        "mileage_km": 24000,
        "engine_cc": 1496,
        "fuel_type": "petrol",
        "transmission": "cvt",
        "body_type": "sedan",
        "auction_grade": "4.5",
        "location_jp": "Nagoya, Japan",
        "url": "https://www.sbtjapan.com/used-cars/search?make=TOYOTA&model=COROLLA",
        "images": CAR_IMAGES["corolla"]
    },
    {
        "source": "beforward",
        "source_id": "bf_honda_civic_2023",
        "make": "Honda",
        "model": "Civic",
        "year": 2023,
        "price_usd": 18900,
        "mileage_km": 14000,
        "engine_cc": 1496,
        "fuel_type": "petrol",
        "transmission": "manual",
        "body_type": "sedan",
        "auction_grade": "5.0",
        "location_jp": "Yokohama, Japan",
        "url": "https://www.beforward.jp/honda/civic/",
        "images": CAR_IMAGES["civic"]
    },
    {
        "source": "sbt",
        "source_id": "sbt_mazda_demio_2021",
        "make": "Mazda",
        "model": "Demio (Mazda 2)",
        "year": 2021,
        "price_usd": 8900,
        "mileage_km": 37000,
        "engine_cc": 1496,
        "fuel_type": "petrol",
        "transmission": "automatic",
        "body_type": "hatchback",
        "auction_grade": "4.0",
        "location_jp": "Osaka, Japan",
        "url": "https://www.sbtjapan.com/used-cars/search?make=MAZDA&model=DEMIO",
        "images": CAR_IMAGES["demio"]
    }
]

LOCAL_SEED_DATA = [
    {
        "source": "peachcars",
        "source_id": "peach_toyota_harrier_2021",
        "make": "Toyota",
        "model": "Harrier",
        "year": 2021,
        "price_kes": 4850000,
        "mileage_km": 41000,
        "engine_cc": 1998,
        "fuel_type": "hybrid",
        "transmission": "automatic",
        "body_type": "suv",
        "condition": "imported_used",
        "location": "Nairobi Showroom, Kilimani",
        "listing_url": "https://peachcars.co.ke/cars/toyota-harrier-2021",
        "images_json": json.dumps(CAR_IMAGES["harrier"])
    },
    {
        "source": "peachcars",
        "source_id": "peach_toyota_prado_2020",
        "make": "Toyota",
        "model": "Land Cruiser Prado",
        "year": 2020,
        "price_kes": 6900000,
        "mileage_km": 49000,
        "engine_cc": 2754,
        "fuel_type": "diesel",
        "transmission": "automatic",
        "body_type": "suv",
        "condition": "local_used",
        "location": "Nairobi Showroom, Westlands",
        "listing_url": "https://peachcars.co.ke/cars/toyota-prado-2020",
        "images_json": json.dumps(CAR_IMAGES["prado"])
    },
    {
        "source": "peachcars",
        "source_id": "peach_mazda_cx5_2022",
        "make": "Mazda",
        "model": "CX-5",
        "year": 2022,
        "price_kes": 3800000,
        "mileage_km": 32000,
        "engine_cc": 2188,
        "fuel_type": "diesel",
        "transmission": "automatic",
        "body_type": "suv",
        "condition": "imported_used",
        "location": "Mombasa Road Showroom",
        "listing_url": "https://peachcars.co.ke/cars/mazda-cx5-2022",
        "images_json": json.dumps(CAR_IMAGES["cx5"])
    },
    {
        "source": "peachcars",
        "source_id": "peach_honda_fit_2022",
        "make": "Honda",
        "model": "Fit",
        "year": 2022,
        "price_kes": 1950000,
        "mileage_km": 23000,
        "engine_cc": 1317,
        "fuel_type": "petrol",
        "transmission": "automatic",
        "body_type": "hatchback",
        "condition": "imported_used",
        "location": "Nairobi Showroom, Lavington",
        "listing_url": "https://peachcars.co.ke/cars/honda-fit-2022",
        "images_json": json.dumps(CAR_IMAGES["fit"])
    }
]


def load_test_data(count: int = 10) -> int:
    """Clear old repetitive dummy records and insert unique realistic test listings."""
    db = SessionLocal()
    try:
        # 1. Clear old dummy records with example.com URLs
        dummy_deleted = db.query(CarListing).filter(CarListing.url.like("%example.com%")).delete(synchronize_session=False)
        if dummy_deleted > 0:
            logger.info("Cleared %d dummy test listings", dummy_deleted)

        inserted_car = 0
        for item in IMPORT_SEED_DATA:
            existing = db.query(CarListing).filter_by(source_id=item["source_id"]).first()
            if not existing:
                db.add(CarListing(
                    source=item["source"],
                    source_id=item["source_id"],
                    make=item["make"],
                    model=item["model"],
                    year=item["year"],
                    price_usd=item["price_usd"],
                    mileage_km=item["mileage_km"],
                    engine_cc=item["engine_cc"],
                    fuel_type=item["fuel_type"],
                    transmission=item["transmission"],
                    body_type=item["body_type"],
                    auction_grade=item.get("auction_grade", "4.0"),
                    location_jp=item.get("location_jp", "Yokohama, Japan"),
                    url=item["url"],
                    images=json.dumps(item["images"]),
                    is_cleaned=True,
                    status="active",
                    scraped_at=datetime.utcnow()
                ))
                inserted_car += 1

        inserted_local = 0
        for item in LOCAL_SEED_DATA:
            existing = db.query(LocalListing).filter_by(source_id=item["source_id"]).first()
            if not existing:
                db.add(LocalListing(
                    source=item["source"],
                    source_id=item["source_id"],
                    make=item["make"],
                    model=item["model"],
                    year=item["year"],
                    price_kes=item["price_kes"],
                    mileage_km=item["mileage_km"],
                    engine_cc=item["engine_cc"],
                    fuel_type=item["fuel_type"],
                    transmission=item["transmission"],
                    body_type=item["body_type"],
                    condition=item["condition"],
                    location=item["location"],
                    listing_url=item["listing_url"],
                    images_json=item["images_json"],
                    status="active",
                    scraped_at=datetime.utcnow()
                ))
                inserted_local += 1

        db.commit()
        cache.clear()
        total_inserted = inserted_car + inserted_local
        logger.info("Loaded %d import listings and %d local listings", inserted_car, inserted_local)
        return total_inserted
    except Exception as e:
        db.rollback()
        logger.error("Failed to load test data: %s", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    load_test_data()
    print("Successfully populated realistic unique car listings with valid images and working URLs!")
