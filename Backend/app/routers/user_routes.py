from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi.errors import RateLimitExceeded
from app.models.user import User
from app.services.user_services import update_user_data, request_reset_password, verify_otp_reset_password, change_password, get_user_by_id
from app.dependencies.auth_dependency import get_current_user
from app.schemas.user_schema import UserPersonalData, VerifyEmailData, VerifyResetPasswordOTPData, ChangePasswordData

router = APIRouter()

@router.get("/profile", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_profile(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await get_user_by_id(current_user.id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.post("/request-reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def request_reset_password_endpoint(request: Request, email_data: VerifyEmailData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await request_reset_password(email_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/verify-reset-password-otp", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def verify_password_reset_otp (request: Request, otp_data: VerifyResetPasswordOTPData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await verify_otp_reset_password(otp_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/change-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def reset_password(request: Request, password_data: ChangePasswordData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await change_password(password_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.put("/update-personal-data", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def update_personal_data(request: Request, user_data: UserPersonalData, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await update_user_data(current_user.id, user_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e