from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .user_schema import UserData
from .barangay_schema import BarangayModel
from .category_schema import CategoryModel
from .department_schema import DepartmentModel
from .priority_level_schema import PriorityLevelModel
from pydantic import BaseModel
from datetime import datetime 



class ComplaintBaseModel(BaseModel):
    title: str
    description: str
    location_details: Optional[str] = None
    barangay_id: int
    category_id: int

class ComplaintCreateData(ComplaintBaseModel):
    pass

class ComplaintWithUserData(ComplaintBaseModel):
    id: int
    status: Optional[str] = None
    created_at: datetime
    user: UserData
    barangay: BarangayModel
    category: Optional[CategoryModel] = None
    department: Optional[DepartmentModel] = None
    priority_level: Optional[PriorityLevelModel] = None
    priority_level_id: Optional[int] = None  # ← was int, now Optional



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
    class Config:
        from_attributes = True