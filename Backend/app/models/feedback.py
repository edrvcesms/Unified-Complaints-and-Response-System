from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    comments = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="feedback")
    user = relationship("User", back_populates="feedback")