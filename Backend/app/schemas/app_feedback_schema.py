from pydantic import BaseModel
from datetime import datetime
from .user_schema import UserData
from .incident_schema import IncidentData

class AppFeedbackBase(BaseModel):
    ratings: float
    message: str | None = None

class AppFeedbackCreate(AppFeedbackBase):
    pass

class AppFeedbackResponse(AppFeedbackBase):
    id: int
    created_at: datetime
    user: UserData

    class Config:
        from_attributes = True
        
class PostIncidentFeedbackCreate(BaseModel):
    incident_id: int
    ratings: float
    message: str | None = None
    
class PostIncidentFeedbackResponse(PostIncidentFeedbackCreate):
    id: int
    created_at: datetime
    user: UserData
    incident: IncidentData

    class Config:
        from_attributes = True