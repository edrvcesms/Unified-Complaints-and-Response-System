from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .user_schema import UserData

class ResponseSchema(BaseModel):
    id: int
    incident_id: int
    responder_id: int
    actions_taken: str
    response_date: datetime
    user: Optional[UserData] = None

    class Config:
        from_attributes = True
        
class ResponseCreateSchema(BaseModel):
    actions_taken: str