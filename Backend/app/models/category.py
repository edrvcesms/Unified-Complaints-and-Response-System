from datetime import date, timezone

from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String
from datetime import datetime
from sqlalchemy.orm import relationship

class Category(Base):

    __tablename__ = "category"

    id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="category")
    incidents = relationship("IncidentModel", back_populates="category")