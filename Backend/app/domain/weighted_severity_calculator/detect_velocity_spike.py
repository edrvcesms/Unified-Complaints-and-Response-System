"""
Application Layer — Detect Velocity Spike Use Case.

SRP: Only computes complaint velocity for a given incident.
DIP: Depends on IIncidentRepository (abstract), not the SQLAlchemy implementation.
"""

import logging
from datetime import datetime

from app.domain.entities.incident import IncidentEntity
from app.domain.interfaces.i_incident_repository import IIncidentRepository
from app.domain.interfaces.i_velocity_detector import IVelocityDetector
from app.domain.value_objects.velocity_window import VelocityWindow

logger = logging.getLogger(__name__)


class DetectVelocitySpikeUseCase(IVelocityDetector):
    """
    Measures how many complaints were submitted to an incident
    within its category-specific time window.

    This implements IVelocityDetector — it can be injected into
    RecalculateSeverityUseCase without that use-case knowing the implementation.
    """

    def __init__(self, incident_repository: IIncidentRepository):
        self._repo = incident_repository

    async def get_velocity(self, incident: IncidentEntity) -> VelocityWindow:
        """
        Count complaints linked to this incident within its time window.
        Returns a VelocityWindow value object with rate-per-hour.
        """
        window_hours = incident.time_window_hours
        complaint_count = await self._repo.count_complaints_in_window(
            incident_id=incident.id,
            window_hours=window_hours,
        )

        velocity = VelocityWindow(
            window_hours=window_hours,
            complaint_count=complaint_count,
            window_start=datetime.utcnow(),
        )

        logger.info(
            f"Incident {incident.id} velocity: "
            f"{complaint_count} complaints in {window_hours}h "
            f"({velocity.complaints_per_hour:.2f}/hr)"
        )

        return velocity