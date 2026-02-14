from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.complaint_schema import ComplaintCreateData
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.services.complaint_services import submit_complaint, get_complaints_by_sector, get_my_complaints, delete_complaint, review_complaints, resolve_complaint
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from fastapi.requests import Request

router = APIRouter()

@router.get("/sector/{sector_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_complaints_by_sector(request: Request, sector_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await get_complaints_by_sector(sector_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)
    
@router.post("/submit-complaint", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_complaint(request: Request, complaint_data: ComplaintCreateData, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await submit_complaint(complaint_data, current_user.id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)
    
@router.get("/my-complaints", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_my_complaints(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await get_my_complaints(current_user.id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)
    
@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def remove_complaint(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await delete_complaint(complaint_id, current_user.id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)
    
@router.post("/review/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def review_complaint(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await review_complaints(complaint_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)
    
@router.post("/resolve/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def resolve_complaint_route(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    try:
        return await resolve_complaint(complaint_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(request, e)