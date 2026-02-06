from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Barangay(Base):
    __tablename__ = "barangay"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    barangay_name = Column(String, nullable=False)
    barangay_address = Column(String, nullable=False)
    barangay_contact_number = Column(String, nullable=True)
    barangay_email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)
    
    barangay_account = relationship("BarangayAccount", back_populates="barangay")