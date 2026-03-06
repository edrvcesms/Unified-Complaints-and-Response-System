from pydantic import BaseModel
from datetime import datetime
from .user_schema import UserData
from .barangay_schema import BarangayAccountWithDetails
from typing import List

class AnnouncementBase(BaseModel):
    title: str
    content: str
    
class AnnouncementCreate(AnnouncementBase):
  pass


class MediaOut(BaseModel):
    id: int
    announcement_id: int
    media_url: str
    media_type: str
    
    class Config:
        from_attributes = True
    

class AnnouncementOut(AnnouncementBase):
    id: int
    uploader_id: int
    uploader: UserData
    barangay_account: BarangayAccountWithDetails | None
    created_at: datetime
    updated_at: datetime | None
    media: List[MediaOut]
  
    
    class Config:
        from_attributes = True
        