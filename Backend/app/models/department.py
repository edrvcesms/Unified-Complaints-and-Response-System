from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Department(Base):

    __tablename__ = "department"

    id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    department_account = relationship("DepartmentAccount", back_populates="department")
    complaint = relationship("Complaint", back_populates="department")