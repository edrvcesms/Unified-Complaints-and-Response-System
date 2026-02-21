from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class DepartmentAccount(Base):
    __tablename__ = "department_account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("department.id"), nullable=False)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    user = relationship("User", back_populates="department_account")
    department = relationship("Department", back_populates="department_account")
    report = relationship("Report", back_populates="department_account")
    complaint = relationship("Complaint", back_populates="department_account")