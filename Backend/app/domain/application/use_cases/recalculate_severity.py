"""
Application Layer — Recalculate Severity Use Case.

SRP: Only recalculates and persists severity for a given incident.
DIP: Depends on ISeverityCalculator and IVelocityDetector abstractions.
OCP: New scoring models can be added by implementing ISeverityCalculator.
"""

import logging
import math
from typing import Dict

from app.domain.entities.incident import IncidentEntity
from app.domain.interfaces.i_incident_repository import IIncidentRepository
from app.domain.interfaces.i_severity_calculator import ISeverityCalculator
from app.domain.interfaces.i_velocity_detector import IVelocityDetector
from app.domain.value_objects.severity_level import SeverityLevel
from app.domain.value_objects.velocity_window import VelocityWindow

logger = logging.getLogger(__name__)

# Base severity weights per category_id (1–5 scale).
# These mirror the values seeded in category_configs.
# The DB is the source of truth; this is a fallback default.
CATEGORY_BASE_WEIGHTS: Dict[int, float] = {
    1:  3.0,   # Noise Disturbance
    2:  4.0,   # Illegal Dumping
    3:  3.5,   # Road Damage
    4:  2.5,   # Street Light Outage
    5:  5.0,   # Flooding / Drainage Issue
    6:  4.5,   # Illegal Construction
    7:  2.0,   # Stray Animals
    8:  3.0,   # Public Intoxication
    9:  2.5,   # Illegal Vending
    10: 4.0,   # Water Supply Issue
    11: 3.5,   # Garbage Collection Issue
    12: 2.0,   # Vandalism
    13: 2.0,   # Other
}
DEFAULT_BASE_WEIGHT = 2.0


class WeightedSeverityCalculator(ISeverityCalculator):
    """
    Computes severity using three weighted components:

      severity = base_weight + count_weight + velocity_weight
               = base_category_weight
               + log2(complaint_count) * 1.5
               + complaints_per_hour   * 2.0

    Clamped to [1.0, 10.0]. Maps to SeverityLevel via SeverityLevel.from_score().

    OCP: A different calculator (e.g. ML-based) can implement ISeverityCalculator
         and be swapped in via the DI container.
    """

    async def calculate(
        self,
        incident: IncidentEntity,
        velocity: VelocityWindow,
    ) -> float:
        base_weight = CATEGORY_BASE_WEIGHTS.get(
            incident.category_id, DEFAULT_BASE_WEIGHT
        )

        # log2(1) = 0, so first complaint contributes 0 count weight.
        # This grows slowly: log2(10) ≈ 3.3, log2(50) ≈ 5.6
        count_weight = math.log2(max(incident.complaint_count, 1)) * 1.5

        velocity_weight = velocity.complaints_per_hour * 2.0

        raw_score = base_weight + count_weight + velocity_weight
        clamped = round(min(max(raw_score, 1.0), 10.0), 2)

        logger.info(
            f"Severity for incident {incident.id}: "
            f"base={base_weight:.1f} + count={count_weight:.2f} + velocity={velocity_weight:.2f} "
            f"= {raw_score:.2f} → clamped={clamped} → {SeverityLevel.from_score(clamped).value}"
        )

        return clamped


class RecalculateSeverityUseCase:
    """
    Orchestrates velocity detection and severity calculation,
    then persists the updated severity back to the incident.

    DIP: Depends on abstractions for both calculator and velocity detector.
    SRP: Only responsible for the recalculation workflow.
    """

    def __init__(
        self,
        incident_repository: IIncidentRepository,
        severity_calculator: ISeverityCalculator,
        velocity_detector: IVelocityDetector,
    ):
        self._repo = incident_repository
        self._calculator = severity_calculator
        self._velocity_detector = velocity_detector

    async def execute(self, incident_id: int) -> IncidentEntity:
        incident = await self._repo.get_by_id(incident_id)
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")

        velocity = await self._velocity_detector.get_velocity(incident)
        new_score = await self._calculator.calculate(incident, velocity)

        incident.update_severity(new_score)
        updated = await self._repo.update(incident)

        logger.info(
            f"Incident {incident_id} severity updated: "
            f"score={updated.severity_score}, level={updated.severity_level.value}"
        )
        return updated