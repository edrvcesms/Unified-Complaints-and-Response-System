from fastapi import APIRouter, Depends, status
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.complaint_schema import ComplaintCreateData
from app.dependencies.rate_limiter import limiter
from app.services.complaint_services import submit_complaint, get_my_complaints, delete_complaint, review_complaints, resolve_complaint, get_all_complaints
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from fastapi.requests import Request

router = APIRouter()

@router.get("/all", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_all_complaints(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_complaints(db)

@router.get("/my-complaints", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def list_my_complaints(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_my_complaints(current_user.id, db)
    
@router.post("/submit-complaint", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_complaint(request: Request, complaint_data: ComplaintCreateData, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await submit_complaint(complaint_data, current_user.id, db)

@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def remove_complaint(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await delete_complaint(complaint_id, current_user.id, db)

@router.patch("/review/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def review_complaint(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await review_complaints(complaint_id, db)
    
@router.patch("/resolve/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def resolve_complaint_route(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await resolve_complaint(complaint_id, db)