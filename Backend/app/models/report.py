from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Report(Base):
    __tablename__ = "report"

    id = Column(Integer, primary_key=True, index=True)
    generated_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    report_type = Column(String, nullable=False)
    barangay_account_id = Column(Integer, ForeignKey("barangay_account.id"), nullable=True)
    comittee_account_id = Column(Integer, ForeignKey("comittee_account.id"), nullable=True)
    file_path = Column(String, nullable=False)
    generated_at = Column(Date, nullable=False)

    generated_by = relationship("User", back_populates="report")
    barangay_account = relationship("BarangayAccount", back_populates="report")
    comittee_account = relationship("ComitteeAccount", back_populates="report")
    complaint = relationship("Complaint", back_populates="report")