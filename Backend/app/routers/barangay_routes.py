from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.barangay_schema import BarangayAccountCreate
from app.services.barangay_services import get_all_barangays, get_barangay_by_id
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

router = APIRouter()

@router.get("/all", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_barangays(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await get_all_barangays(db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException:
        raise

@router.get("/{barangay_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def retrieve_barangay(request: Request, barangay_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await get_barangay_by_id(barangay_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException:
        raise
