from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey('emergency_agencies.id'))
    contact_number = Column(String, nullable=False)

    agency = relationship("EmergencyAgency", back_populates="emergency_contacts")