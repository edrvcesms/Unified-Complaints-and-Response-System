from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .user_schema import UserData
from .barangay_schema import BarangayModel
from .category_schema import CategoryModel
from .sector_schema import SectorModel
from .priority_level_schema import PriorityLevelModel

class ComplaintBaseModel(BaseModel):
    title: str
    description: str
    location_details: Optional[str] = None
    barangay_id: int
    category_id: int
    department_id: Optional[int] = None
    priority_level_id: Optional[int] = None

class ComplaintCreateData(ComplaintBaseModel):
    pass

class ComplaintWithUserData(ComplaintBaseModel):
    id: int
    status: Optional[str] = None
    created_at: datetime
    user: UserData
    barangay: BarangayModel
    category: Optional[CategoryModel] = None
    sector: Optional[SectorModel] = None
    priority_level: Optional[PriorityLevelModel] = None
    priority_level_id: Optional[int] = None  # ← was int, now Optional
