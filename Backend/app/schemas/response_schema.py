from pydantic import BaseModel
from typing import Optional

class ResponseSchema(BaseModel):
    id: int
    complaint_id: int
    responder_id: int
    actions_taken: str
    response_date: str

    class Config:
        orm_mode = True
        
class ResponseCreateSchema(BaseModel):
    actions_taken: str