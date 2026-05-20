"""
backend/app/models/ml_model.py

ORM model for tracking ML model versions.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON
from sqlalchemy.sql import func

from app.database import Base


class MLModelVersion(Base):
    __tablename__ = "ml_model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_tag = Column(String, nullable=False, index=True)
    model_path = Column(String, nullable=False)
    encoder_path = Column(String, nullable=False)
    metrics = Column(JSON, default=dict)
    n_train = Column(Integer)
    n_test = Column(Integer)
    r2 = Column(Float)
    mae = Column(Float)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
