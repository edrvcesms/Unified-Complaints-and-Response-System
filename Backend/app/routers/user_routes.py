from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi.errors import RateLimitExceeded
from app.models.user import User
from app.services.user_services import update_user_data
from app.dependencies.auth_dependency import get_current_user
from app.schemas.user_schema import UserPersonalData

router = APIRouter()

@router.put("/update-personal-data", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute", error_message="Too many requests. Please try again later.")
async def update_personal_data(request: Request, user_data: UserPersonalData, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return await update_user_data(current_user.id, user_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e