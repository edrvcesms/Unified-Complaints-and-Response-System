from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Notification(Base):
    __tablename__ = "notification"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint", back_populates="notifications")