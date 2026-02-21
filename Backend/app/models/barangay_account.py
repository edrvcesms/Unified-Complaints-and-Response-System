from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship

class BarangayAccount(Base):
    __tablename__ = "barangay_account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="barangay_account")
    barangay = relationship("Barangay", back_populates="barangay_account")
    report = relationship("Report", back_populates="barangay_account")