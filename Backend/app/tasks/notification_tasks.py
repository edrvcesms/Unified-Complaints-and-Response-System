from app.utils.push_notifications import send_push_notification
from app.utils.logger import logger
from app.celery_worker import celery_worker
from asgiref.sync import async_to_sync
from app.models.notification import Notification
from app.database.database import AsyncSessionLocal
from datetime import datetime, timezone
from app.utils.caching import delete_cache
from app.utils.redis_pub import publish_sse_event

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification_task(self, token: str, enabled: bool, title: str = None, body: str = "", data: dict = None, sound: str = "default", expo_token: str = None):
    try:
        result = send_push_notification(
            token=token,
            enabled=enabled,
            title=title,
            body=body,
            data=data or {},
            sound=sound,
            expo_token=expo_token,
        )
        if not result["success"]:
            logger.exception(f"Push notification failed: {result}")
        else:
            logger.info(f"Push notification sent successfully: {result}")
    except Exception as e:
        logger.exception(f"Push notification task failed: {e}")
        raise self.retry(exc=e)
      
      
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_notifications_task(
    self,
    user_id: int,
    title: str,
    message: str,
    complaint_id: int = None,
    incident_id: int = None,
    notification_type: str = "info",
    channel: str = "in_app",
    event: str = None,
):

    async def _run():
        async with AsyncSessionLocal() as db:
            notification = Notification(
                user_id=user_id,
                complaint_id=complaint_id,
                incident_id=incident_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channel="sse",
                is_read=False,
                sent_at=datetime.now(timezone.utc),
            )
            db.add(notification)
            await db.commit()
            logger.info(f"Notification saved to DB for user_id={user_id}, complaint_id={complaint_id}")

            await delete_cache(f"user_notifications:{user_id}")
            await publish_sse_event(
                "sse:user",
                {
                    "target": str(user_id),
                    "event": event or notification_type,
                    "data": {
                        "title": title,
                        "message": message,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "complaint_id": complaint_id,
                        "incident_id": incident_id,
                        "notification_type": notification_type,
                        "channel": channel,
                    }
                }
            )
            
    async_to_sync(_run)()