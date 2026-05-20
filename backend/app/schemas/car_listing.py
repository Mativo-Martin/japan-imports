from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CarListingBase(BaseModel):
    source:       str
    make:         str
    model:        str
    year:         int   = Field(..., ge=2018, le=2030)
    mileage_km:   Optional[int]   = None
    engine_cc:    Optional[int]   = None
    fuel_type:    Optional[str]   = None
    transmission: Optional[str]   = None
    body_type:    Optional[str]   = None
    price_usd:    Optional[float] = None

class CarListingOut(CarListingBase):
    id:         int
    url:        Optional[str]
    scraped_at: datetime

    class Config:
        from_attributes = True

class CarListingFilter(BaseModel):
    make:      Optional[str]   = None
    model:     Optional[str]   = None
    year_min:  Optional[int]   = 2018
    year_max:  Optional[int]   = 2025
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    fuel_type: Optional[str]   = None
    source:    Optional[str]   = None
    page:      int = 1
    page_size: int = Field(20, le=100)
