# app/celery_worker.py
from celery import Celery
from app.core.config import settings

celery_worker = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Import all task modules here so Celery knows them
# Must be BEFORE worker starts

celery_worker.autodiscover_tasks(["app.tasks"])
# Optional: can start worker programmatically, usually not needed
if __name__ == "__main__":
    celery_worker.start()
