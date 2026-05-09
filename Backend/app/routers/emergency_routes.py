# app/api/v1/emergency_router.py
from fastapi import APIRouter, Depends, Request
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.rate_limiter import limiter
from app.schemas.emergency_schema import EmergencyClassifyRequest, EmergencyClassifyResponse
from app.models.user import User
from app.schemas.emergency_schema import EmergencyClassifyRequest, EmergencyClassifyResponse
from app.services.emergency_services import EmergencyService
from app.domain.infrastracture.llm.openai_emergency_classifier import OpenAIEmergencyClassifier

router = APIRouter()

from app.core.config import settings


@router.post("/classify", response_model=EmergencyClassifyResponse)
@limiter.limit("20/minute")
async def classify_emergency_endpoint(
    request: Request,
    data: EmergencyClassifyRequest,
    current_user: User = Depends(get_current_user),
):
    classifier = OpenAIEmergencyClassifier(api_key=settings.OPEN_AI_API_KEY)
    service = EmergencyService(classifier=classifier)
    return await service.classify_emergency(data)