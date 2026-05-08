from pydantic import BaseModel
from datetime import datetime


class FeedbackUserData(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None

    class Config:
        from_attributes = True


class FeedbackIncidentData(BaseModel):
    id: int
    title: str | None = None

    class Config:
        from_attributes = True

class AppFeedbackBase(BaseModel):
    ratings: float
    message: str | None = None

class AppFeedbackCreate(AppFeedbackBase):
    pass

class AppFeedbackResponse(AppFeedbackBase):
    id: int
    created_at: datetime
    user: FeedbackUserData

    class Config:
        from_attributes = True

class PostIncidentFeedbackCreate(BaseModel):
    complaint_id: int
    ratings: float
    message: str | None = None

class PostIncidentFeedbackResponse(BaseModel):
    id: int
    incident_id: int
    ratings: float
    message: str | None = None
    created_at: datetime
    user: FeedbackUserData
    incident: FeedbackIncidentData

    class Config:
        from_attributes = True