from app.database.database import Base
from sqlalchemy import Column, DateTime, Integer, String
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

class Department(Base):

    __tablename__ = "department"

    id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True, default=datetime.now(timezone.utc))

    department_account = relationship("DepartmentAccount", back_populates="department", uselist=False)