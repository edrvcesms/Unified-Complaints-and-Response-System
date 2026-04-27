from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class RejectionCategory(Base):
    __tablename__ = "rejection_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    
    complaint = relationship("Complaint", back_populates="rejection_category")