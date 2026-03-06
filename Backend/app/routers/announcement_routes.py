from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request, Form
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user
from app.services.announcement_services import create_announcement, get_all_announcements, get_announcement_by_id
from app.schemas.announcement_schema import AnnouncementCreate
from app.dependencies.rate_limiter import limiter
from app.models.user import User

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_announcements(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_announcements(db)

@router.get("/{announcement_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_announcement(request: Request, announcement_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_announcement_by_id(announcement_id, db)

@router.post("/create", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def upload_announcement(request: Request,announcement_data: str = Form(...), media_files: List[UploadFile] = File(default=[]), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
  
    if current_user.role not in ["lgu_official", "barangay_official"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create announcements."
        )
    announcement_data = AnnouncementCreate.model_validate_json(announcement_data)
    return await create_announcement(announcement_data, media_files, current_user.id, db)