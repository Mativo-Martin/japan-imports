from sqlalchemy import Column, Integer, Float, DateTime, String
from datetime import datetime
from app.database import Base

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id         = Column(Integer, primary_key=True)
    from_ccy   = Column(String(3))   # USD
    to_ccy     = Column(String(3))   # KES
    rate       = Column(Float)
    source     = Column(String(50))  # open.er-api.com
    fetched_at = Column(DateTime, default=datetime.utcnow)
