from datetime import datetime
from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class PriorityLevel(Base):
    __tablename__ = "priority_level"

    id = Column(Integer, primary_key=True, index=True)
    priority_name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="priority_level")