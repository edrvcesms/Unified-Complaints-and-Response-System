from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_db, get_async_db
from app.dependencies.auth_dependency import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.schemas.auth_schema import LoginData, RegisterData, OTPVerificationData
from app.models.user import User
from app.services.auth_services import register_user, verify_otp_and_register, send_otp_email, login_user
from fastapi.requests import Request

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute", error_message="Too many registration attempts. Please try again later.")
async def register(request: Request, user_data: RegisterData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await register_user(user_data, db)
    except HTTPException as e:
        logger.error(f"Registration error for {user_data.email}: {e.detail}")
        raise e
    
@router.post("/verify-otp", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute", error_message="Too many OTP verification attempts. Please try again later.")
async def verify_otp(request: Request, user_data: OTPVerificationData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await verify_otp_and_register(user_data.otp, user_data, db)
    except HTTPException as e:
        logger.error(f"OTP verification error for {user_data.email}: {e.detail}")
        raise e
    
@router.post("/login", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute", error_message="Too many login attempts. Please try again later.")
async def login(request: Request, login_data: LoginData, db: AsyncSession = Depends(get_async_db)):
    try:
        return await login_user(login_data, db)
    except HTTPException as e:
        logger.error(f"Login error for {login_data.email}: {e.detail}")
        raise e
  