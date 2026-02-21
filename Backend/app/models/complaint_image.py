from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from datetime import datetime
from sqlalchemy.orm import relationship

class ComplaintImage(Base):
    __tablename__ = "complaint_image"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    image_url = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="images")