
from datetime import datetime
from app.database.database import Base

from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Boolean, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase    


class IncidentComplaintModel(Base):
    """
    Join table linking complaints to incidents.
    Tracks similarity score and when the complaint was clustered.
    """
    __tablename__ = "incident_complaints"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False, index=True)
    similarity_score = Column(Float, nullable=False)
    linked_at = Column(DateTime, nullable=False, default=datetime.utcnow)

   
    incident = relationship("IncidentModel", back_populates="complaint_clusters")

    __table_args__ = (
     
        Index("ix_unique_incident_complaint", "incident_id", "complaint_id", unique=True),
    )
