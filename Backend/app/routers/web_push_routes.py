from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user
from app.services.web_push_services import subscribe_user_to_push_notifications
from app.schemas.web_push_schema import PushSubscriptionSchema, PushNotificationPayload
from app.dependencies.rate_limiter import limiter
from app.models.user import User


router = APIRouter()

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_push_notifications(
    request: Request,
    subscription_data: PushSubscriptionSchema,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    try:
        await subscribe_user_to_push_notifications(
            user_id=current_user.id,
            subscription_data=subscription_data,
            db=db,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while subscribing the user to push notifications: {str(e)}",
        )