from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .user_schema import UserData
from .barangay_schema import BarangayModel
from .category_schema import CategoryModel
from .department_schema import DepartmentModel
from .response_schema import ResponseSchema
from pydantic import BaseModel
from datetime import datetime 
from .attachment_schema import AttachmentBaseModel


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

    
class IncidentData(BaseModel):
    id: int
    responses: Optional[List[ResponseSchema]] = []

    class Config:
        from_attributes = True
        
class IncidentLinkData(BaseModel):
    id: int
    response_id: Optional[int] = None
    incident: Optional[IncidentData] = None

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
    department: DepartmentInfo | None = None
    incident_links: Optional[List[IncidentLinkData]] = None
    class Config:
        from_attributes = True
        

class ComplaintWithUserData(ComplaintBaseModel):
    id: int
    status: Optional[str] = None
    created_at: datetime
    user: UserData
    barangay: BarangayModel
    category: Optional[CategoryModel] = None
    department: Optional[DepartmentModel] = None
    attachment: List[AttachmentBaseModel]
    incident_links: Optional[List[IncidentLinkData]] = None
    
    class Config:
        from_attributes = True