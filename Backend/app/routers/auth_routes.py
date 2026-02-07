from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_db
from app.dependencies.auth_dependency import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.schemas.auth_schema import RegisterUser
from app.models.user import User
from app.services.auth_services import register_user
from fastapi.requests import Request

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute", error_message="Too many registration attempts. Please try again later.")
async def register(request: Request, user_data: RegisterUser, db: AsyncSession = Depends(get_db)):
    try:
        return await register_user(user_data, db)
    except HTTPException as e:
        logger.error(f"Registration error for {user_data.email}: {e.detail}")
        raise e