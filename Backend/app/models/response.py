from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

class Response(Base):
    __tablename__ = "response"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaint.id"), nullable=False)
    responder_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    actions_taken = Column(String, nullable=False)
    response_date = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)

    complaint = relationship("Complaint", back_populates="responses")
    responder = relationship("User", back_populates="responses")