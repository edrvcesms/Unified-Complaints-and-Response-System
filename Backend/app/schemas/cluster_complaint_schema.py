from pydantic import BaseModel
from datetime import datetime

class ClusterComplaintSchema(BaseModel):
    complaint_id: int
    user_id: int
    title: str
    description: str
    barangay_id: int
    category_id: int
    sector_id: int | None = None
    priority_level_id: int | None = None
    category_time_window_hours: int
    category_base_severity_weight: float
    similarity_threshold: float
    created_at: datetime