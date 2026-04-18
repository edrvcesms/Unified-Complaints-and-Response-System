from pydantic import BaseModel
from typing import Optional

class ComplaintCategoryCreate(BaseModel):
    category_name: str

class PriorityLevelCreate(BaseModel):
    priority_name: str

    
class LGUAccountCreate(BaseModel):
    email: str
    password: str
    
class DepartmentAccountCreate(BaseModel):
    department_name: str
    description: Optional[str] = None
    email: str
    password: str
    
class AddEvacuationCenterLocation(BaseModel):
    center_name: str
    barangay_id: int
    latitude: float
    longitude: float

class CategoryConfigsUpdate(BaseModel):
    base_severity_weight: Optional[float] = None
    time_window_hours: Optional[float] = None
    category_radius_km: Optional[float] = None
    similarity_threshold: Optional[float] = None
    