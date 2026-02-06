from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class ComplaintImage(Base):
    __tablename__ = "complaint_image"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    image_url = Column(String, nullable=False)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    complaint = relationship("Complaint", back_populates="images")