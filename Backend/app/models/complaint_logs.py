from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class ComplaintLogs(Base):
    __tablename__ = "complaint_logs"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False)
    new_status = Column(String, nullable=False)
    updated_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True))

    updated_by_user = relationship("User", back_populates="logs")
    complaint = relationship("Complaint", back_populates="logs")