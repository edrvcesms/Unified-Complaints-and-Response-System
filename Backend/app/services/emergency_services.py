# app/services/emergency_service.py
from app.domain.interfaces.i_emergency_classifier import IEmergencyClassifier
from app.schemas.emergency_schema import EmergencyClassifyRequest, EmergencyClassifyResponse

class EmergencyService:

    def __init__(self, classifier: IEmergencyClassifier):
        self._classifier = classifier

    async def classify_emergency(self, data: EmergencyClassifyRequest) -> EmergencyClassifyResponse:
        return await self._classifier.classify(data)