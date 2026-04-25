from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.schemas.notification_schema import NotificationCreateData, NotificationData
from sqlalchemy import select
from app.utils.logger import logger
from datetime import datetime, timezone
from app.utils.caching import get_cache, set_cache, delete_cache

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
        return NotificationData.model_validate(new_notification, from_attributes=True)
      
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in create_notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_user_notifications(user_id: int, db: AsyncSession):
    try:
        notification_cache = await get_cache(f"user_notifications:{user_id}")
        if notification_cache:
            logger.info(f"Cache hit for notifications of user ID {user_id}")
            return [NotificationData.model_validate_json(n) if isinstance(n, str) else NotificationData.model_validate(n, from_attributes=True) for n in notification_cache]
        result = await db.execute(
            select(Notification).where(Notification.user_id == user_id).order_by(Notification.sent_at.desc())
        )
        notifications = result.scalars().all()
        logger.info(f"Fetched notifications for user ID {user_id}: {len(notifications)} notifications found")
        notification_list = [NotificationData.model_validate(notification, from_attributes=True) for notification in notifications]
        await set_cache(f"user_notifications:{user_id}", [n.model_dump_json() for n in notification_list], expiration=300)
        return notification_list
      
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
        return {"message": "All notifications marked as read"}
      
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in mark_all_notifications_as_read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
