from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class ImportCostEstimate(Base):
    __tablename__ = "import_cost_estimates"

    id               = Column(Integer, primary_key=True)
    listing_id       = Column(Integer, ForeignKey("car_listings.id"))
    purchase_usd     = Column(Float, nullable=False)
    shipping_usd     = Column(Float)
    insurance_usd    = Column(Float)
    cif_usd          = Column(Float)
    usd_kes_rate     = Column(Float)
    cif_kes          = Column(Float)
    customs_duty_kes = Column(Float)  # 25% of CIF
    excise_duty_kes  = Column(Float)  # 20% of (CIF+customs)
    vat_kes          = Column(Float)  # 16% of (CIF+customs+excise)
    idf_levy_kes     = Column(Float)  # 3.5% of CIF, min 5000
    rdl_levy_kes     = Column(Float)  # 2% of CIF
    port_charges_kes = Column(Float)  # ~35,000
    clearing_kes     = Column(Float)  # ~40,000
    ntsa_kes         = Column(Float)  # ~12,000
    total_kes        = Column(Float)
    calculated_at    = Column(DateTime, default=datetime.utcnow)
