from celery import Celery
from app.core.config import settings

celery_worker = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

if __name__ == "__main__":
    celery_worker.start()

import app.tasks  # Import tasks to register them with Celery
