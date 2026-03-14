from fastapi import APIRouter, Depends, status, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from  app.services.sse_manager import sse_manager
from app.dependencies.auth_dependency import get_current_user
from app.services.notification_services import get_user_notifications, mark_notification_as_read, mark_all_notifications_as_read
from app.models.user import User
from app.dependencies.db_dependency import get_async_db
router = APIRouter()



@router.get("/", status_code=status.HTTP_200_OK)
async def get_notifications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await get_user_notifications(current_user.id, db)

@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(notification_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await mark_notification_as_read(notification_id, current_user.id, db)

@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await mark_all_notifications_as_read(current_user.id, db)

@router.get("/stream")
async def notifications_stream(current_user: User = Depends(get_current_user), db = Depends(get_async_db)):
  
    return await sse_manager.stream(current_user.id)