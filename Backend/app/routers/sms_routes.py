from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.schemas.sms_schema import SendSMSRequest
from app.services.sms_services import send_sms

router = APIRouter()

@router.post("/send", status_code=status.HTTP_200_OK)
async def send_sms_endpoint(sms_data: SendSMSRequest, current_user: User = Depends(get_current_user)):
    result = await send_sms(sms_data)
    if not result.get("success"):
        raise HTTPException(
            status_code=result.get("status_code", status.HTTP_400_BAD_REQUEST),
            detail=result.get("error", "Failed to send SMS."),
        )
    return result