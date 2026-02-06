from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class ComitteeAccount(Base):
    __tablename__ = "comittee_account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    sector_id = Column(Integer, ForeignKey("sector.id"), nullable=False)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    user = relationship("User", back_populates="comittee_account")
    sector = relationship("Sector", back_populates="comittee_account")
    report = relationship("Report", back_populates="comittee_account")
    complaint = relationship("Complaint", back_populates="comittee_account")