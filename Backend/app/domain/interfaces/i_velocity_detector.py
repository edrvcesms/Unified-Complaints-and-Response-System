from abc import ABC, abstractmethod
from app.domain.entities.incident import IncidentEntity
from app.domain.value_objects.velocity_window import VelocityWindow


class IVelocityDetector(ABC):
    """
    ISP: Single concern — measure complaint rate for an incident.
    Separated from ISeverityCalculator by ISP: severity calculation
    and velocity measurement are distinct responsibilities.
    """

    @abstractmethod
    async def get_velocity(self, incident: IncidentEntity) -> VelocityWindow:
        """
        Compute the complaint velocity for the given incident
        using its category-specific time window.

        Returns:
            VelocityWindow with complaint_count and complaints_per_hour.
        """
        ...