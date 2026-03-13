from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class EventMedia(Base):
    __tablename__ = 'event_media'

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey('events.id'))
    media_url = Column(String)
    media_type = Column(String)
    uploaded_at = Column(DateTime)
    
    event = relationship("Event", back_populates="media")