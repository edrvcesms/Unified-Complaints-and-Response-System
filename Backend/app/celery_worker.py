from celery import Celery
from app.core.config import settings

celery_worker = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

import app.tasks  # Import tasks to register them with Celery
