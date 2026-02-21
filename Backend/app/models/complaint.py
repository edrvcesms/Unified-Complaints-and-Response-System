from datetime import date

from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Complaint(Base):
    __tablename__ = "complaint"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sector.id"), nullable=True)
    comittee_account_id = Column(Integer, ForeignKey("comittee_account.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False)
    priority_level_id = Column(Integer, ForeignKey("priority_level.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location_details = Column(String, nullable=True)
    status = Column(String, nullable=True)
    forwarded_at = Column(Date, nullable=True)
    resolved_at = Column(Date, nullable=True)
    created_at = Column(Date, nullable=False, default=date.today)
    updated_at = Column(Date, nullable=True)

    user = relationship("User", back_populates="complaint")
    barangay = relationship("Barangay", back_populates="complaint")
    sector = relationship("Sector", back_populates="complaint")
    category = relationship("Category", back_populates="complaint")
    priority_level = relationship("PriorityLevel", back_populates="complaint")
    images = relationship("ComplaintImage", back_populates="complaint")
    attachment = relationship("Attachment", back_populates="complaint")
    comittee_account = relationship("ComitteeAccount", back_populates="complaint")
    response = relationship("Response", back_populates="complaint")
    feedback = relationship("Feedback", back_populates="complaint")
    notifications = relationship("Notification", back_populates="complaint")