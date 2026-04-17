"""
Infrastructure Layer — SQLAlchemy ORM Models.

These are purely persistence models. Domain entities are separate.
Mapping between ORM models and domain entities happens in the repository layer.
"""

from datetime import datetime, timezone
from app.database.database import Base
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Boolean, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase    


class IncidentModel(Base):
    """
    Represents a clustered incident composed of one or more similar complaints.
    Created automatically when a complaint has no matching active incident.
    """
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False, index=True)
    department_account_id = Column(Integer, ForeignKey("department_account.id"), nullable=True)
    lgu_account_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    hearing_date = Column(DateTime(timezone=True), nullable=True)
    
    last_expiry_notif_user_id = Column(Integer, nullable=True, default=None)
    last_expiry_notif_checkpoint = Column(Integer, nullable=True, default=None)
    

    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    complaint_count = Column(Integer, nullable=False, default=1)

    severity_score = Column(Float, nullable=False, default=1.0)
    severity_level = Column(String(20), nullable=False, default="LOW")

    # Category-specific merge window in hours (set at incident creation)
    time_window_hours = Column(Float, nullable=False, default=24.0)

    first_reported_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    last_reported_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    # New complaint tracking
    has_new_complaints = Column(Boolean, nullable=False, default=False)
    new_complaint_count = Column(Integer, nullable=False, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    responses = relationship("Response", back_populates="incident", cascade="all, delete-orphan")
    complaint_clusters = relationship("IncidentComplaintModel", back_populates="incident", cascade="all, delete-orphan")
    barangay = relationship("Barangay", back_populates="incidents")
    category = relationship("Category", back_populates="incidents")
    department_account = relationship("DepartmentAccount", back_populates="incidents")
    lgu_account = relationship("User", back_populates="incidents")
    post_incident_feedbacks = relationship("PostIncidentFeedback", back_populates="incident", cascade="all, delete-orphan")
    __table_args__ = (
        # Composite index for the most common query pattern:
        # "Find active incidents in this barangay + category"
        Index("ix_incident_barangay_category_status", "barangay_id", "category_id", "status"),
    )