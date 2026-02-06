from app.database.database import Base
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

class ComplaintStatus(Base):
    __tablename__ = "complaint_status"

    id = Column(String, primary_key=True, index=True)
    status_name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=True)

    complaint = relationship("Complaint", back_populates="complaint_status")