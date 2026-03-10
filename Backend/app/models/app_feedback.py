from app.database.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship

class AppFeedback(Base):
    __tablename__ = "app_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    ratings = Column(Float, nullable=False)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="app_feedbacks")