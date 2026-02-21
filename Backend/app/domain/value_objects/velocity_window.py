from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class VelocityWindow:
    """
    Represents a time window used to measure complaint velocity (rate per hour).
    Immutable — computed once per use-case call.
    """
    window_hours: float
    complaint_count: int
    window_start: datetime

    @property
    def complaints_per_hour(self) -> float:
        if self.window_hours <= 0:
            return 0.0
        return self.complaint_count / self.window_hours

    @property
    def window_end(self) -> datetime:
        return self.window_start + timedelta(hours=self.window_hours)
