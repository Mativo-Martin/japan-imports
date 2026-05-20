from sqlalchemy import Column, Integer, Float, DateTime, String
from datetime import datetime
from app.database import Base

class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id             = Column(Integer, primary_key=True)
    listing_id     = Column(Integer)
    predicted_usd  = Column(Float)
    actual_usd     = Column(Float)
    model_version  = Column(String(20))
    features_json  = Column(String)  # input features snapshot
    created_at     = Column(DateTime, default=datetime.utcnow)
