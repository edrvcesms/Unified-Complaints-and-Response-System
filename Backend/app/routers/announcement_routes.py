from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request, Form
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user, get_current_user_optional
from app.services.announcement_services import create_announcement, get_all_announcements, get_announcement_by_id, get_announcement_by_uploader, delete_announcement, edit_announcement
from app.schemas.announcement_schema import AnnouncementCreate
from app.dependencies.rate_limiter import limiter
from app.models.user import User
from app.core.pagination_params import ListParams

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
# this route will return all announcements of lgu if the current_user is not provided, otherwise it will return all announcements of the current_user's barangay and the lgu announcements
# so i must check if the current_user is provided, if not, return all announcements of lgu, otherwise return all announcements of the current_user's barangay and the lgu announcements
# but the dependency get_current_user will raise an exception if the user is not authenticated, even if the route is public, so i must make the current_user dependency optional, and check if the current_user is None, if so, return all announcements of lgu, otherwise return all announcements of the current_user's barangay and the lgu announcements, but it always returns 401 unauthorized if the user is not authenticated, so i must make the current_user dependency optional, and check if the current_user is None, if so, return all announcements of lgu, otherwise return all announcements of the current_user's barangay and the lgu announcements
async def read_announcements(request: Request, params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    if current_user is None:
        # If no current_user, return all announcements of lgu
        return await get_all_announcements(db, params, None)
    return await get_all_announcements(db, params, current_user.barangay)

@router.get("/my-announcements", status_code=status.HTTP_200_OK)
@limiter.limit("50/minute")
async def read_my_announcements(request: Request, params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_announcement_by_uploader(current_user.id, db, params)

@router.get("/{announcement_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_announcement(request: Request, announcement_id: int, db: AsyncSession = Depends(get_async_db)):
    return await get_announcement_by_id(announcement_id, db)

@router.post("/create", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_announcement(request: Request,announcement_data: str = Form(...), media_files: Optional[List[UploadFile]] = File(default=[]), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
  
    if current_user.role not in ["lgu_official", "barangay_official"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create announcements."
        )
    announcement_data = AnnouncementCreate.model_validate_json(announcement_data)
    return await create_announcement(announcement_data, media_files, current_user.id, db)

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def remove_announcement(request: Request, announcement_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await delete_announcement(announcement_id, current_user.id, db)

@router.put("/{announcement_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
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
