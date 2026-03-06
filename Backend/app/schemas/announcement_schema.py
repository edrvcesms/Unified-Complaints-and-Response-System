from pydantic import BaseModel
from datetime import datetime

class AnnouncementBase(BaseModel):
    title: str
    content: str
    
class AnnouncementCreate(AnnouncementBase):
  pass