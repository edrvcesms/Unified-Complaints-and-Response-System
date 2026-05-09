from abc import ABC, abstractmethod

from dataclasses import dataclass

@dataclass
class VerificationResult:
    is_same_incident: bool
    is_emergency: bool

from abc import ABC, abstractmethod



class IIncidentVerifier(ABC):

    @abstractmethod
    async def is_same_incident(
        self,
        complaint_a: str,
        complaint_b: str,
    ) -> VerificationResult:
        ...

    @abstractmethod
    async def detect_emergency(self, complaint: str) -> VerificationResult:
        ...