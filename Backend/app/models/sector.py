from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Sector(Base):

    __tablename__ = "sector"

    id = Column(Integer, primary_key=True, index=True)
    sector_name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    comittee_account = relationship("ComitteeAccount", back_populates="sector")
    complaint = relationship("Complaint", back_populates="sector")