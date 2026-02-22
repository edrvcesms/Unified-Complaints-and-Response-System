from abc import ABC, abstractmethod


class IIncidentVerifier(ABC):
    """
    Domain interface for LLM-based incident verification.
    
    SRP: Only responsible for determining if two complaints refer to the same incident.
    DIP: Use-cases depend on this abstraction, not a concrete LLM implementation.
    OCP: New verifiers (GPT, Gemini, Claude) can be added without touching use-case code.
    """

    @abstractmethod
    async def is_same_incident(
        self,
        complaint_a: str,
        complaint_b: str,
    ) -> bool:
        """
        Returns True if both complaints refer to the same specific incident.
        """
        ...