from abc import ABC, abstractmethod
from typing import Optional
from app.domain.entities.incident import IncidentEntity
from app.domain.entities.complaint_cluster import ComplaintClusterEntity


class IIncidentRepository(ABC):
    """
    ISP: Handles only incident and cluster persistence.
    SQLAlchemy, raw SQL, or any other ORM can implement this.
    """

    @abstractmethod
    async def get_by_id(self, incident_id: int) -> Optional[IncidentEntity]:
        ...

    @abstractmethod
    async def create(self, incident: IncidentEntity) -> IncidentEntity:
        """Persist a new incident and return it with its assigned ID."""


    @abstractmethod
    async def update(self, incident: IncidentEntity) -> IncidentEntity:
        """Persist changes to an existing incident (complaint_count, severity, etc.)."""
    

    @abstractmethod
    async def link_complaint(self, cluster: ComplaintClusterEntity) -> ComplaintClusterEntity:
        """Create a record in incident_complaints linking a complaint to an incident."""
        ...

    @abstractmethod
    async def count_complaints_in_window(
        self,
        incident_id: int,
        window_hours: float,
    ) -> int:
        """
        Count how many complaints were linked to this incident
        within the last `window_hours`. Used for velocity calculation.
        """
        ...
        
    @abstractmethod
    async def get_active_incidents_in_window(
    self,
    barangay_id: int,
    category_id: int,
    time_window_hours: float,
) -> list[IncidentEntity]:
      ...
      
    @abstractmethod
    async def get_incident_complaint_statuses(self, incident_id: int) -> list[str]:
        """
        Get all complaint statuses for a given incident.
        Used to check if the incident is already under review.
        """
        ...  