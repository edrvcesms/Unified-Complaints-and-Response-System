from pydantic import BaseModel
from typing import Optional

class ComplaintCategoryCreate(BaseModel):
    category_name: str

class PriorityLevelCreate(BaseModel):
    priority_name: str

class SectorCreate(BaseModel):
    sector_name: str
    description: Optional[str] = None