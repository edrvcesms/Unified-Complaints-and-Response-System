from celery import Celery
from datetime import timedelta
from app.core.config import settings

celery_worker = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_worker.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_worker.conf.beat_schedule = {
    "resolve-expired-incidents-every-30-mins": {
        "task": "app.tasks.incident_tasks.resolve_expired_incidents_task",
        "schedule": timedelta(minutes=30),
    },
    "expiry-warning-notifications-every-30-mins": {
        "task": "app.tasks.incident_tasks.expiry_warning_notifications_task",
        "schedule": timedelta(minutes=30),
    },
}

celery_worker.autodiscover_tasks([
    "app.tasks",
])