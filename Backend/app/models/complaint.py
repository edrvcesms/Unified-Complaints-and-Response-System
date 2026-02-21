from datetime import date

from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import DateTime
from datetime import datetime

class Complaint(Base):
    __tablename__ = "complaint"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    barangay_id = Column(Integer, ForeignKey("barangay.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("department.id"), nullable=True)
    department_account_id = Column(Integer, ForeignKey("department_account.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False)
    priority_level_id = Column(Integer, ForeignKey("priority_level.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location_details = Column(String, nullable=True)
    status = Column(String, nullable=True)
    forwarded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="complaint")
    barangay = relationship("Barangay", back_populates="complaint")
    department = relationship("Department", back_populates="complaint")
    category = relationship("Category", back_populates="complaint")
    priority_level = relationship("PriorityLevel", back_populates="complaint")
    images = relationship("ComplaintImage", back_populates="complaint")
    attachment = relationship("Attachment", back_populates="complaint")
    department_account = relationship("DepartmentAccount", back_populates="complaint")
    response = relationship("Response", back_populates="complaint")
    feedback = relationship("Feedback", back_populates="complaint")
    notifications = relationship("Notification", back_populates="complaint")