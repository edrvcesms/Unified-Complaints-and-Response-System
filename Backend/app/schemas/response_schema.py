from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ResponseSchema(BaseModel):
    id: int
    incident_id: int
    responder_id: int
    actions_taken: str
    response_date: datetime

    class Config:
        orm_mode = True
        
class ResponseCreateSchema(BaseModel):
    actions_taken: str