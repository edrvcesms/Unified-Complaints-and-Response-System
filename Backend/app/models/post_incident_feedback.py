from app.database.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class PostIncidentFeedback(Base):
    __tablename__ = "post_incident_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    ratings = Column(Float, nullable=False)
    message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))

    user = relationship("User", back_populates="post_incident_feedbacks")
    incident = relationship("IncidentModel", back_populates="post_incident_feedbacks")