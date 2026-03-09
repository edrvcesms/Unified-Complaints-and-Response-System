from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from app.domain.value_objects.severity_level import SeverityLevel


@dataclass
class IncidentEntity:
    """
    Core domain entity representing a clustered incident.
    This is a pure Python dataclass with NO SQLAlchemy or framework dependency.
    
    An incident is created when the first complaint of its kind is submitted,
    or when no similar active incident exists within the category time window.
    """
    id: Optional[int]
    title: str
    description: str
    barangay_id: int
    category_id: int
    status: str                          # "ACTIVE" | "RESOLVED"
    complaint_count: int
    severity_score: float
    severity_level: SeverityLevel
    time_window_hours: float             # category-specific merge window
    first_reported_at: datetime
    last_reported_at: datetime
    latitude: Optional[float] = None     # seeded from first complaint
    longitude: Optional[float] = None    # seeded from first complaint
    has_new_complaints: bool = False
    new_complaint_count: int = 0
    last_viewed_at: Optional[datetime] = None

    def increment_complaint_count(self) -> None:
        self.complaint_count += 1
        self.last_reported_at = datetime.utcnow()
        self.has_new_complaints = True
        self.new_complaint_count += 1

    def update_severity(self, new_score: float) -> None:
        self.severity_score = round(min(max(new_score, 1.0), 10.0), 2)
        self.severity_level = SeverityLevel.from_score(self.severity_score)
    
    def mark_as_viewed(self) -> None:
        """Mark incident as viewed, resetting new complaint indicators"""
        self.has_new_complaints = False
        self.new_complaint_count = 0
        self.last_viewed_at = datetime.utcnow()

    @property
    def is_active(self) -> bool:
        return self.status == "ACTIVE"