from abc import ABC, abstractmethod
from app.domain.entities.incident import IncidentEntity
from app.domain.value_objects.velocity_window import VelocityWindow


class ISeverityCalculator(ABC):
    """
    ISP: Single concern — compute a severity score for an incident.
    OCP: New scoring formulas can be added by creating a new implementation.
    """

    @abstractmethod
    async def calculate(
        self,
        incident: IncidentEntity,
        velocity: VelocityWindow,
    ) -> float:
        """
        Compute a severity score in the range [1.0, 10.0].

        Formula components:
          - base_category_weight: preset weight per category (1–5)
          - complaint_count_weight: log2(count) * 1.5
          - velocity_weight: complaints_per_hour * 2.0

        Returns:
            float clamped to [1.0, 10.0]
        """
        ...