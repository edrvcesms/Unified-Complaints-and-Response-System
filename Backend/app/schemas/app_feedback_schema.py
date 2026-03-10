from pydantic import BaseModel
from datetime import datetime
from .user_schema import UserData

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