from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from .response_schema import ResponseSchema

from .attachment_schema import AttachmentBaseModel
from .barangay_schema import BarangayModel
from .category_schema import CategoryModel


class ComplaintUserData(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone_number: str | None = None

    class Config:
        from_attributes = True


class ComplaintAttachmentData(AttachmentBaseModel):
    class Config:
        from_attributes = True


class ComplaintBaseModel(BaseModel):
    title: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_details: Optional[str] = None
    barangay_id: int
    barangay_account_id: Optional[int] = None
    category_id: int
    is_rejected_by_lgu: Optional[bool] = None
    is_rejected_by_department: Optional[bool] = None

class ComplaintCreateData(ComplaintBaseModel):
    pass

class ResponseData(BaseModel):
    id: int
    responses: Optional[List[ResponseSchema]] = []

    class Config:
        from_attributes = True

class IncidentLinkData(BaseModel):
    id: int
    response_id: Optional[int] = None
    incident: Optional[ResponseData] = None

    class Config:
        from_attributes = True

class BarangayInfo(BaseModel):
    id: int
    barangay_name: str
    barangay_address: str

    class Config:
        from_attributes = True

class CategoryInfo(BaseModel):
    id: int
    category_name: str

    class Config:
        from_attributes = True
        

class DepartmentInfo(BaseModel):
    id: int
    department_name: str
    description: str | None

    class Config:
        from_attributes = True

class MyComplaintData(BaseModel):
    id: int
    title: str
    description: str | None
    location_details: str | None
    status: str | None
    created_at: datetime
    barangay: BarangayInfo | None
    category: CategoryInfo | None
    is_rejected_by_lgu: Optional[bool] = None
    is_rejected_by_department: Optional[bool] = None

    class Config:
        from_attributes = True
        

class ComplaintWithUserData(ComplaintBaseModel):
    id: int
    status: Optional[str] = None
    created_at: datetime
    user: ComplaintUserData
    barangay: BarangayModel
    category: Optional[CategoryModel] = None
    attachment: List[ComplaintAttachmentData] = []
    incident_links: Optional[List[IncidentLinkData]] = None
    is_rejected_by_lgu: Optional[bool] = None
    is_rejected_by_department: Optional[bool] = None
    hearing_date: Optional[datetime] = None
    has_feedback: Optional[bool] = None
    
    class Config:
        from_attributes = True
        
class ComplaintOut(BaseModel):
    id: int
    title: str
    description: str | None
    location_details: str | None
    status: str | None
    is_rejected_by_lgu: Optional[bool] = None
    is_rejected_by_department: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True