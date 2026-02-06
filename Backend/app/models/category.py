from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Category(Base):

    __tablename__ = "category"

    id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    complaint = relationship("Complaint", back_populates="category")