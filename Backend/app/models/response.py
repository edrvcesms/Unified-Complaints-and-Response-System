from app.database.database import Base
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship

class Response(Base):
    __tablename__ = "response"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    responder_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    message = Column(String, nullable=False)
    action_taken = Column(String, nullable=True)
    attachment_path = Column(String, nullable=True)
    created_at = Column(Date, nullable=False)
    updated_at = Column(Date, nullable=True)

    complaint = relationship("Complaint", back_populates="response")
    responder = relationship("User", back_populates="response")