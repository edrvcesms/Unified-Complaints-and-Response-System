from app.database.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Event(Base):
    __tablename__ = 'events'

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String, index=True)
    description = Column(String)
    date = Column(DateTime)
    location = Column(String)
    
    media = relationship("EventMedia", back_populates="event", cascade="all, delete-orphan")