from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class EventBase(BaseModel):
    event_name: str
    description: Optional[str] = None
    date: datetime
    location: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
class EventCreate(EventBase):
    pass

class EventMedia(BaseModel):
    id: int
    media_url: str
    media_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class EventData(EventBase):
    id: int
    media: List[EventMedia] = []

    class Config:
        from_attributes = True
  