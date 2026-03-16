from typing import Optional

from pydantic import BaseModel
from datetime import datetime

class NotificationCreateData(BaseModel):
    title: str
    message: str
    user_id: int
    complaint_id: Optional[int] = None
    channel: str
    notification_type: str
    is_read: bool = False
    
class NotificationData(BaseModel):
    id: int
    title: str
    message: str
    user_id: int
    complaint_id: Optional[int] = None
    channel: str
    notification_type: str
    sent_at: datetime
    is_read: bool
    
    class Config:
        from_attributes = True