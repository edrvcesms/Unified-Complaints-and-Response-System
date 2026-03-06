from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Announcement(Base):
    __tablename__ = "announcement"

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, default=datetime.utcnow)

    uploader = relationship("User", back_populates="announcements")
    media = relationship("AnnouncementMedia", back_populates="announcement", cascade="all, delete-orphan")