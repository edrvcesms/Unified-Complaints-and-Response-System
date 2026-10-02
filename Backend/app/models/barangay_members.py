from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database.database import Base

class BarangayMember(Base):
    __tablename__ = 'barangay_members'

    id = Column(Integer, primary_key=True)
    barangay_id = Column(Integer, ForeignKey('barangay.id'), nullable=False)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    
    barangay = relationship("Barangay", back_populates="barangay_members")
    complaints = relationship(
        "Complaint",
        secondary="complaint_barangay_members",
        back_populates="barangay_members",
    )
    responses = relationship(
        "Response",
        secondary="response_barangay_members",
        back_populates="barangay_members",
    )
    