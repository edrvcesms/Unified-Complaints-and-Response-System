from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class Event(Base):
    __tablename__ = 'events'

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('user.id'))
    event_name = Column(String, index=True)
    description = Column(String)
    date = Column(DateTime(timezone=True))
    location = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    media = relationship("EventMedia", back_populates="event", cascade="all, delete-orphan")
    uploader = relationship("User", back_populates="events", foreign_keys=[uploader_id])