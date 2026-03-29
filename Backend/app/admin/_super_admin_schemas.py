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
    