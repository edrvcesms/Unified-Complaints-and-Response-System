from app.celery_worker import celery_worker
from app.database.database import AsyncSessionLocal
from app.models.response import Response
from app.utils.logger import logger
from asgiref.sync import async_to_sync
from datetime import datetime, timezone


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def save_response_task(self, incident_id: int, responder_id: int, actions_taken: str):

    async def _run():
        async with AsyncSessionLocal() as db:

            response = Response(
                incident_id=incident_id,
                responder_id=responder_id,
                actions_taken=actions_taken,
                response_date=datetime.now(timezone.utc),
            )
            db.add(response)
            await db.commit()
            
        return {
            "response_id": response.id,
            "incident_id": incident_id,
            "responder_id": responder_id,
            "actions_taken": actions_taken,
            "response_date": response.response_date.isoformat(),
        }

    try:
        async_to_sync(_run)()
    except Exception as e:
        logger.exception(f"Response failed: {e}")
        raise self.retry(exc=e)