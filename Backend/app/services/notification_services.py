from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.schemas.notification_schema import NotificationCreateData, NotificationData
from sqlalchemy import select
from app.utils.logger import logger
from datetime import datetime, timezone
from app.utils.caching import get_cache, set_cache, delete_cache
from app.core.pagination import paginate
from app.core.pagination_params import ListParams
from app.core.pagination_response import PaginatedResponse
from app.utils.caching import DEFAULT_LIST_CACHE_TTL_SECONDS, EMPTY_LIST_CACHE_TTL_SECONDS, build_list_cache_key, delete_cache_prefix

async def create_notification(notification_data: NotificationCreateData, db: AsyncSession):
    try:
        new_notification = Notification(
            user_id=notification_data.user_id,
            title=notification_data.title,
            message=notification_data.message,
            complaint_id=notification_data.complaint_id,
            channel=notification_data.channel,
            notification_type=notification_data.notification_type,
            sent_at=datetime.now(timezone.utc),
            is_read=notification_data.is_read
        )
        db.add(new_notification)
        await db.commit()
        await db.refresh(new_notification)
        logger.info(f"Created notification for user ID {notification_data.user_id}: {notification_data.message}")
        await delete_cache(f"user_notifications:{notification_data.user_id}")
        await delete_cache_prefix("notifications")
        return NotificationData.model_validate(new_notification, from_attributes=True)
      
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in create_notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_user_notifications(user_id: int, db: AsyncSession, params: ListParams) -> PaginatedResponse[NotificationData]:
    try:
        cache_key = build_list_cache_key("notifications", params.model_dump(mode="json"), user_id=user_id)
        notification_cache = await get_cache(cache_key)
        if notification_cache is not None:
            logger.info(f"Cache hit for notifications of user ID {user_id}")
            return PaginatedResponse[NotificationData].model_validate(notification_cache)
        statement = select(Notification).where(Notification.user_id == user_id).order_by(Notification.sent_at.desc())
        page = await paginate(db, statement, params, mapper=lambda item: NotificationData.model_validate(item, from_attributes=True))
        response = PaginatedResponse[NotificationData].model_validate(page)
        await set_cache(cache_key, response.model_dump(mode="json"), expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response.data else EMPTY_LIST_CACHE_TTL_SECONDS)
        return response
      
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in get_user_notifications: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
async def mark_notification_as_read(notification_id: int, user_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        )
        notification = result.scalars().first()
        
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        
        notification.is_read = True
        await db.commit()
        logger.info(f"Marked notification ID {notification_id} as read for user ID {user_id}")
        await delete_cache(f"user_notifications:{user_id}")
        await delete_cache_prefix("notifications")
        return {"message": "Notification marked as read"}
      
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in mark_notification_as_read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def mark_all_notifications_as_read(user_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
        )
        notifications = result.scalars().all()
        
        for notification in notifications:
            notification.is_read = True
        
        await db.commit()
        logger.info(f"Marked all notifications as read for user ID {user_id}")
        await delete_cache(f"user_notifications:{user_id}")
        await delete_cache_prefix("notifications")
        return {"message": "All notifications marked as read"}
      
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in mark_all_notifications_as_read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
