from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String, nullable=False, default="default", index=True)  # tenant key
    sku = Column(String, nullable=False, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    unit_price = Column(Float, nullable=False, default=0.0)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    warehouse_location = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
