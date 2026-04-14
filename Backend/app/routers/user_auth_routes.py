from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import   get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.schemas.user_auth_schema import LoginData, RegisterData, OTPVerificationData, ResendOtpData
from app.services.user_auth_services import logout_user, register_user, verify_otp_and_register, login_user, refresh_access_token, officials_login, superadmin_login, resend_otp_code
from app.utils.turnstile import verify_turnstile
from slowapi.errors import RateLimitExceeded
from fastapi.requests import Request
import json

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def register(request: Request, user_data: RegisterData, db: AsyncSession = Depends(get_async_db)):
    return await register_user(user_data, db)

@router.post("/verify-otp", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def verify_otp(request: Request, data: str = Form(...), front_id: UploadFile = None, back_id: UploadFile = None,selfie_with_id: UploadFile = None, db: AsyncSession = Depends(get_async_db)):
    parsed_data = json.loads(data)
    otp_data = OTPVerificationData(**parsed_data)
    return await verify_otp_and_register(otp_data.otp, otp_data, front_id, back_id, selfie_with_id, db)

@router.post("/resend-otp", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def resend_otp(request: Request, email: ResendOtpData, db: AsyncSession = Depends(get_async_db)):
    return await resend_otp_code(email, db)

@router.post("/login", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def login(request: Request, login_data: LoginData, db: AsyncSession = Depends(get_async_db)):
    await verify_turnstile(login_data.turnstile_token, request)
    return await login_user(login_data, db)

@router.post("/officials-login", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def officials_login_route(request: Request, login_data: LoginData, db: AsyncSession = Depends(get_async_db)):
    await verify_turnstile(login_data.turnstile_token, request)
    return await officials_login(login_data, db)

@router.post("/superadmin-login", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def superadmin_login_route(request: Request, login_data: LoginData, db: AsyncSession = Depends(get_async_db)):
    await verify_turnstile(login_data.turnstile_token, request)
    return await superadmin_login(login_data, db)

@router.post("/logout", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def logout(request: Request, db: AsyncSession = Depends(get_async_db)):
    return await logout_user(request)

@router.post("/refresh-token", status_code=status.HTTP_200_OK)
@limiter.limit("100/minute")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_async_db)):
    return await refresh_access_token(request, db)