from pydantic import BaseModel
from datetime import datetime
from .user_schema import UserData
from .barangay_schema import BarangayAccountWithDetails

class AnnouncementBase(BaseModel):
    title: str
    content: str
    
class AnnouncementCreate(AnnouncementBase):
  pass

class AnnouncementOut(AnnouncementBase):
    id: int
    uploader_id: int
    uploader: UserData
    barangay_account: BarangayAccountWithDetails | None
  
    
    class Config:
        from_attributes = True