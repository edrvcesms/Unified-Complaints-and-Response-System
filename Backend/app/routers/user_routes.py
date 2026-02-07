from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi.errors import RateLimitExceeded
from app.models.user import User

router = APIRouter()

