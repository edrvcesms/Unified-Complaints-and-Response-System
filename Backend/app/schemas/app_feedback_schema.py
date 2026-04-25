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
    complaint_id: int
    ratings: float
    message: str | None = None
    
class UsersData(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None

    class Config:
        from_attributes = True
        
class IncidentDatas(BaseModel):
    id: int
    title: str | None = None
    description: str | None = None
    resolver_id: int | None = None

    class Config:
        from_attributes = True

class PostIncidentFeedbackResponse(BaseModel):
    id: int
    ratings: float
    message: str | None = None
    created_at: datetime
    user: UsersData
    incident: IncidentDatas

    class Config:
        from_attributes = True