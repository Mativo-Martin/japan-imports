from sqlalchemy import (Column, Integer, String, Float, DateTime, Boolean, Text, Index)

from datetime import datetime
from app.database import Base

class CarListing(Base):
    __tablename__ = "car_listings"


    id            = Column(Integer, primary_key=True, index=True)
    source        = Column(String(50),  nullable=False)    # beforward, sbt, etc.
    source_id     = Column(String(100), unique=True, nullable=False)
    url           = Column(Text)
    make          = Column(String(100), nullable=False, index=True)
    model         = Column(String(100), nullable=False, index=True)
    year          = Column(Integer,     nullable=False, index=True)
    mileage_km    = Column(Integer)
    engine_cc     = Column(Integer)
    fuel_type     = Column(String(20))  # petrol|diesel|hybrid|electric
    transmission  = Column(String(20))  # automatic|manual|cvt
    body_type     = Column(String(50))
    color         = Column(String(50))
    price_usd     = Column(Float,  index=True)
    price_jpy     = Column(Float)
    auction_grade = Column(String(10))
    location_jp   = Column(String(100))
    images        = Column(Text)         # JSON array string
    raw_data      = Column(Text)         # full JSON snapshot
    is_cleaned    = Column(Boolean, default=False, index=True)
    scraped_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_make_model_year", "make", "model", "year"),
    )
