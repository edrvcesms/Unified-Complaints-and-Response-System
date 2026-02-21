from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ComplaintClusterEntity:
    """
    Represents the relationship between a Complaint and an Incident.
    Tracks when the complaint was linked and how similar it was to the cluster.
    """
    id: Optional[int]
    incident_id: int
    complaint_id: int
    similarity_score: float
    linked_at: datetime = None

    def __post_init__(self):
        if self.linked_at is None:
            self.linked_at = datetime.utcnow()
