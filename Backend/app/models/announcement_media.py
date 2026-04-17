from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.database import Base

class AnnouncementMedia(Base):
    __tablename__ = "announcement_media"
    
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcement.id"), nullable=False)
    media_type = Column(String, nullable=False)  # 'image' or 'video'
    media_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=datetime.now(timezone.utc))
    
    announcement = relationship("Announcement", back_populates="media")
    