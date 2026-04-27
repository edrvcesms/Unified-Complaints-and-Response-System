from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user_schema import UserData



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
    user: Optional[UserData] = None
    response_attachments: Optional[List[ResponseAttachmentsData]] = None

    class Config:
        from_attributes = True
        
class ResponseCreateSchema(BaseModel):
    actions_taken: str

class RejectComplaintSchema(BaseModel):
    actions_taken: str
    rejection_category_id: int