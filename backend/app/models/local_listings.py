from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from app.database import Base

class LocalListing(Base):
    __tablename__ = "local_listings"

    id           = Column(Integer, primary_key=True)
    source       = Column(String(50))         # peachcars, sbt_kenya, etc.
    source_id    = Column(String(150), unique=True, nullable=False)
    make         = Column(String(100), index=True)
    model        = Column(String(100), index=True)
    year         = Column(Integer,     index=True)
    mileage_km   = Column(Integer)
    engine_cc    = Column(Integer)
    fuel_type    = Column(String(20))
    transmission = Column(String(20))
    body_type    = Column(String(50))
    drive_type   = Column(String(10))         # 2WD / 4WD / AWD
    color        = Column(String(50))
    price_kes    = Column(Float, index=True, nullable=False)
    condition    = Column(String(30))         # local_used | imported_used
    location     = Column(String(100))
    listing_url  = Column(Text)
    images_json  = Column(Text)               # JSON array string
    scraped_at   = Column(DateTime, default=datetime.utcnow)
