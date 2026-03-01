from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import   get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.schemas.user_auth_schema import LoginData, RegisterData, OTPVerificationData
from app.services.user_auth_services import logout_user, register_user, verify_otp_and_register, login_user, refresh_access_token, officials_login
from slowapi.errors import RateLimitExceeded
from fastapi.requests import Request
import json
from  app.services.sse_manager import sse_manager
router = APIRouter()


@router.get("/notifications/stream")
async def notifications_stream(user_id: str):  # 
    return sse_manager.stream(user_id)
