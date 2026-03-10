from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request, Form
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user
from app.services.announcement_services import create_announcement, get_all_announcements, get_announcement_by_id, get_announcement_by_uploader, delete_announcement, edit_announcement
from app.schemas.announcement_schema import AnnouncementCreate
from app.dependencies.rate_limiter import limiter
from app.models.user import User

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_announcements(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_announcements(db)

@router.get("/my-announcements", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_my_announcements(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_announcement_by_uploader(current_user.id, db)

@router.get("/{announcement_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_announcement(request: Request, announcement_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_announcement_by_id(announcement_id, db)

@router.post("/create", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def upload_announcement(request: Request,announcement_data: str = Form(...), media_files: Optional[List[UploadFile]] = File(default=[]), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
  
    if current_user.role not in ["lgu_official", "barangay_official"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create announcements."
        )
    announcement_data = AnnouncementCreate.model_validate_json(announcement_data)
    return await create_announcement(announcement_data, media_files, current_user.id, db)

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def remove_announcement(request: Request, announcement_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await delete_announcement(announcement_id, current_user.id, db)

@router.put("/{announcement_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def update_announcement(request: Request, announcement_id: int, announcement_data: str = Form(...), keep_media_ids: Optional[str] = Form(default=None), media_files: Optional[List[UploadFile]] = File(default=[]), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    announcement_data = AnnouncementCreate.model_validate_json(announcement_data)
    # Parse keep_media_ids if provided
    keep_ids = []
    if keep_media_ids:
        try:
            import json
            keep_ids = json.loads(keep_media_ids)
        except:
            keep_ids = []
    return await edit_announcement(announcement_id, announcement_data, media_files, keep_ids, current_user.id, db)