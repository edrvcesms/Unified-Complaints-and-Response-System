from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.schemas.barangay_members_schema import BarangayMemberCreate
from app.services.barangay_services import get_all_barangays, get_barangay_by_id, get_barangay_account, mark_barangay_incidents_viewed, get_barangay_members, add_barangay_member, remove_barangay_member
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.logger import logger
from app.core.pagination_params import ListParams

router = APIRouter()


@router.get("/profile", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def barangay_profile(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_barangay_account(current_user.id, db)

@router.get("/all", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_barangays(request: Request, params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_barangays(db, params, current_user.id)

@router.get("/{barangay_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def retrieve_barangay(request: Request, barangay_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_barangay_by_id(barangay_id, db)

@router.post("/{barangay_id}/mark-viewed", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def mark_incidents_viewed(request: Request, barangay_id: int, current_user: User = Depends(get_current_user)):
    return await mark_barangay_incidents_viewed(current_user.id, barangay_id)

@router.get("/{barangay_id}/members", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_barangay_members(request: Request, barangay_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_barangay_members(db, barangay_id)

@router.post("/{barangay_id}/add-member", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_barangay_member(request: Request, barangay_id: int, member_data: BarangayMemberCreate, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    member_payload = member_data.model_copy(update={"barangay_id": barangay_id})
    return await add_barangay_member(db, member_payload)

@router.delete("/{barangay_id}/remove-member/{member_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def delete_barangay_member(request: Request, barangay_id: int, member_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await remove_barangay_member(db, member_id)