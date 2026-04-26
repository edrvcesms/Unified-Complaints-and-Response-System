from pydantic import BaseModel
from datetime import datetime

class ClusterComplaintSchema(BaseModel):
    complaint_id: int
    user_id: int
    title: str
    description: str
    barangay_id: int
    category_id: int
    category_time_window_hours: int
    category_base_severity_weight: float
    similarity_threshold: float
    category_radius_km: float        # ← add
    latitude: float | None = None    # ← add
    longitude: float | None = None   # ← add
    created_at: datetime