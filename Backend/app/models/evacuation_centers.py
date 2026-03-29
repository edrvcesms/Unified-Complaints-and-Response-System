from app.database.database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship

class EvacuationCenter(Base):
    __tablename__ = "evacuation_centers"

    id = Column(Integer, primary_key=True, index=True)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False)
    center_name = Column(String, unique=True, index=True, nullable=False)
    latitude = Column(String, nullable=False)
    longitude = Column(String, nullable=False)
    address = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    
    barangay = relationship("Barangay", back_populates="evacuation_centers")
    
    