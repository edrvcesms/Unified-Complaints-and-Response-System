from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Attachment(Base):
    __tablename__ = "attachment"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String, nullable=False)
    uploaded_at = Column(Date, nullable=False)

    complaint = relationship("Complaint", back_populates="attachment")
    uploader = relationship("User", back_populates="attachment")