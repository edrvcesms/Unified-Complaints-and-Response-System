# app/domain/services/emergency_classifier_interface.py
from abc import ABC, abstractmethod
from app.schemas.emergency_schema import EmergencyClassifyRequest, EmergencyClassifyResponse

class IEmergencyClassifier(ABC):
    @abstractmethod
    async def classify(self, data: EmergencyClassifyRequest) -> EmergencyClassifyResponse:
        raise NotImplementedError