from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship

class Barangay(Base):
    __tablename__ = "barangay"

    id = Column(Integer, primary_key=True, index=True)
    barangay_name = Column(String, nullable=False)
    barangay_address = Column(String, nullable=False)
    barangay_contact_number = Column(String, nullable=True)
    barangay_email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    
    barangay_account = relationship("BarangayAccount", back_populates="barangay", uselist=False)
    complaint = relationship("Complaint", back_populates="barangay")
    incidents = relationship("IncidentModel", back_populates="barangay")