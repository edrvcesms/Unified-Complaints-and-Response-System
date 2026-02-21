from enum import Enum


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    @staticmethod
    def from_score(score: float) -> "SeverityLevel":
        """
        Maps a numeric severity score (1–10) to a SeverityLevel.
        Thresholds are tunable.
        """
        if score >= 8.0:
            return SeverityLevel.CRITICAL
        elif score >= 6.0:
            return SeverityLevel.HIGH
        elif score >= 4.0:
            return SeverityLevel.MEDIUM
        else:
            return SeverityLevel.LOW
