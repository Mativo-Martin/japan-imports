from app.database import SessionLocal
from app.models.car_listings import CarListing
from datetime import datetime

SEED = [
    dict(source="beforward", source_id="BF001", make="Toyota",
         model="Vitz", year=2020, mileage_km=45000, engine_cc=1000,
         fuel_type="petrol", transmission="automatic",
         body_type="hatchback", price_usd=6500, is_cleaned=True,
         scraped_at=datetime.utcnow()),
    dict(source="sbt", source_id="SBT001", make="Honda",
         model="Fit", year=2019, mileage_km=62000, engine_cc=1300,
         fuel_type="petrol", transmission="cvt",
         body_type="hatchback", price_usd=5800, is_cleaned=True,
         scraped_at=datetime.utcnow()),
    dict(source="carfromjapan", source_id="CFJ001", make="Nissan",
         model="Note", year=2021, mileage_km=28000, engine_cc=1200,
         fuel_type="hybrid", transmission="automatic",
         body_type="hatchback", price_usd=9200, is_cleaned=True,
         scraped_at=datetime.utcnow()),
]

db = SessionLocal()
for item in SEED:
    if not db.query(CarListing).filter_by(source_id=item["source_id"]).first():
        db.add(CarListing(**item))
db.commit()
db.close()
print(f"Seeded {len(SEED)} records")
