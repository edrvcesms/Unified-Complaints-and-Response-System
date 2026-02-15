from fastapi import APIRouter, Depends, Request, status
from app.dependencies.rate_limiter import limiter
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.user_services import request_reset_password, verify_otp_reset_password, change_password, get_user_by_id, update_user_location, forgot_password, create_new_password
from app.dependencies.auth_dependency import get_current_user
from app.schemas.user_schema import ResetPasswordData, UserLocationData, UserPersonalData, VerifyEmailData, VerifyResetPasswordOTPData, ChangePasswordData

router = APIRouter()

@router.get("/profile", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_profile(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_user_by_id(current_user.id, db)

@router.post("/request-reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def request_reset_password_endpoint(request: Request, email_data: VerifyEmailData, db: AsyncSession = Depends(get_async_db)):
    return await request_reset_password(email_data, db)

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def forgot_password_endpoint(request: Request, email_data: VerifyEmailData, db: AsyncSession = Depends(get_async_db)):
    return await forgot_password(email_data, db)

@router.post("/create-new-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def create_new_password_endpoint(request: Request, password_data: ResetPasswordData, db: AsyncSession = Depends(get_async_db)):
    return await create_new_password(password_data, db)

@router.post("/verify-reset-password-otp", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def verify_password_reset_otp (request: Request, otp_data: VerifyResetPasswordOTPData, db: AsyncSession = Depends(get_async_db)):
    return await verify_otp_reset_password(otp_data, db)
    
@router.post("/change-password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def reset_password(request: Request, password_data: ChangePasswordData, db: AsyncSession = Depends(get_async_db)):
    return await change_password(password_data, db)

@router.put("/update-current-location", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def update_current_location(request: Request, location_data: UserLocationData, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await update_user_location(current_user.id, location_data, db)