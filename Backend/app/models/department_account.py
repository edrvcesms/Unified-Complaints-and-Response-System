from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, ForeignKey
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class DepartmentAccount(Base):
    __tablename__ = "department_account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("department.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    user = relationship("User", back_populates="department_account")
    department = relationship("Department", back_populates="department_account")
    complaint = relationship("Complaint", back_populates="department_account")
    incidents = relationship("IncidentModel", back_populates="department_account")