from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ComplaintBaseModel(BaseModel):
    title: str
    description: str
    location_details: str
    status: str
    barangay_id: int
    category_id: int
    sector_id: int
    priority_id: int

class ComplaintCreateData(ComplaintBaseModel):
    pass

