from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from .complaint_schema import ComplaintWithUserData
from .category_schema import CategoryModel
from .barangay_schema import BarangayModel

class IncidentBaseModel(BaseModel):
    title: str
    description: str
    barangay_id: int
    category_id: int
    department_id: Optional[int] = None
    status: Optional[str] = None
    complaint_count: int
    severity_level: str

class IncidentComplaintClusterModel(BaseModel):
    id: int
    complaint_id: int
    incident_id: int
    similarity_score: float
    linked_at: datetime
    complaint: ComplaintWithUserData

class IncidentData(IncidentBaseModel):
    id: int
    severity_score: float
    first_reported_at: datetime
    last_reported_at: datetime
    category: Optional[CategoryModel] = None
    barangay: Optional[BarangayModel] = None
    complaint_clusters: List[IncidentComplaintClusterModel] = []
    
    class Config:
        from_attributes = True
