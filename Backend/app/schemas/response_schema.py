from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ResponseUserData(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    role: str | None = None

    class Config:
        from_attributes = True



class ResponseAttachmentsData(BaseModel):
    id: int
    response_id: int
    file_url: str
    media_type: str

    class Config:
        from_attributes = True


class ResponseSchema(BaseModel):
    id: int
    incident_id: int
    responder_id: int
    actions_taken: str
    response_date: datetime
    user: Optional[ResponseUserData] = None
    response_attachments: Optional[List[ResponseAttachmentsData]] = []  

    class Config:
        from_attributes = True
        
class ResponseCreateSchema(BaseModel):
    actions_taken: str

class RejectComplaintSchema(BaseModel):
    actions_taken: str
    rejection_category_id: int