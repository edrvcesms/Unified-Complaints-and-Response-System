from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class EmergencyAgency(Base):
    __tablename__ = "emergency_agencies"

    id = Column(Integer, primary_key=True, index=True)
    agency_name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    emergency_contacts = relationship("EmergencyContact", back_populates="agency", cascade="all, delete-orphan")