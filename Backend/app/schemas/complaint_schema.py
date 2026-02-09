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
    location_details: str
    barangay_id: int
    category_id: int
    sector_id: int
    priority_level_id: int

class ComplaintCreateData(ComplaintBaseModel):
    pass

class ComplaintWithUserData(ComplaintBaseModel):
    id: int
    status: Optional[str] = None
    created_at: datetime
    user: UserData
    barangay: BarangayModel
    category: CategoryModel
    sector: SectorModel
    priority_level: PriorityLevelModel

    priority_level_id: int
