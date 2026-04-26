from app.database.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


class Complaint(Base):
    __tablename__ = "complaint"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False, index=True)
    barangay_account_id = Column(Integer, ForeignKey("barangay_account.id"), nullable=True, index=True)
    department_account_id = Column(Integer, ForeignKey("department_account.id"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False, index=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location_details = Column(String, nullable=True)

    status = Column(String, nullable=True, index=True)

    forwarded_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    hearing_date = Column(DateTime(timezone=True), nullable=True)
    is_rejected_by_lgu = Column(Boolean, default=False, nullable=True)
    is_rejected_by_department = Column(Boolean, default=False, nullable=True)

    user = relationship("User", back_populates="complaint")
    barangay = relationship("Barangay", back_populates="complaint")
    barangay_account = relationship("BarangayAccount", back_populates="complaint")
    department_account = relationship("DepartmentAccount", back_populates="complaint")
    category = relationship("Category", back_populates="complaint")
    images = relationship("ComplaintImage", back_populates="complaint")
    attachment = relationship("Attachment", back_populates="complaint")
    feedback = relationship("Feedback", back_populates="complaint")
    notifications = relationship("Notification", back_populates="complaint")
    logs = relationship("ComplaintLogs", back_populates="complaint", cascade="all, delete-orphan")

   
    incident_links = relationship(
        "IncidentComplaintModel",
        back_populates="complaint",
        cascade="all, delete-orphan"
    )