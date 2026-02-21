"""
Infrastructure Layer — Celery Task Definitions.

Tasks are thin wrappers. All business logic lives in use-cases.
SRP: Tasks only handle async loop management, DB session lifecycle,
     and dispatching to use-cases. No domain logic here.
"""

import asyncio
import os
import logging
from datetime import datetime

from app.celery_worker import celery_worker
from app.database.database import AsyncSessionLocal

from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase


from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.repository.incident_repository import IncidentRepository
from app.dependencies.db_dependency import get_async_db

logger = logging.getLogger(__name__)

# ── Singletons — created once per worker process ──────────────────────────────
# These are stateless so they're safe to share across tasks in the same worker.
_embedding_service = SentenceTransformerEmbeddingService()

_vector_repository = PineconeVectorRepository(
    api_key=os.environ["PINECONE_API_KEY"],
    environment=os.environ.get("PINECONE_ENVIRONMENT", "us-east-1"),
)

_severity_calculator = WeightedSeverityCalculator()


def _run_async(coro):
    """
    Run an async coroutine in a new event loop inside a sync Celery task.
    Each task gets its own loop to avoid event loop conflicts between workers.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_worker.task(
    bind=True,
    name="infrastructure.celery.tasks.cluster_complaint_task",
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(Exception,),
)
def cluster_complaint_task(self, complaint_data: dict) -> dict:
    """
    Celery task: cluster a complaint into an incident.

    Dispatched by the FastAPI route immediately after complaint submission.
    On success, dispatches recalculate_severity_task as a sub-task.
    """
    logger.info(f"[cluster_complaint_task] complaint_id={complaint_data.get('complaint_id')}")

    async def _run():
        async with get_async_db() as db:
            # Build dependencies directly — no container needed
            incident_repo = IncidentRepository(db)
            use_case = ClusterComplaintUseCase(
                embedding_service=_embedding_service,
                vector_repository=_vector_repository,
                incident_repository=incident_repo,
            )

            input_dto = ClusterComplaintInput(
                complaint_id=complaint_data["complaint_id"],
                user_id=complaint_data["user_id"],
                title=complaint_data["title"],
                description=complaint_data["description"],
                barangay_id=complaint_data["barangay_id"],
                category_id=complaint_data["category_id"],
                sector_id=complaint_data.get("sector_id"),
                priority_level_id=complaint_data.get("priority_level_id"),
                category_time_window_hours=complaint_data["category_time_window_hours"],
                category_base_severity_weight=complaint_data["category_base_severity_weight"],
                similarity_threshold=complaint_data["similarity_threshold"],
                created_at=datetime.fromisoformat(complaint_data["created_at"]),
            )

            result = await use_case.execute(input_dto)
            await db.commit()
            return result

    result = _run_async(_run())

    # Dispatch severity recalculation as a follow-up task
    recalculate_severity_task.apply_async(
        args=[result.incident_id],
        queue="severity",
    )

    return {
        "incident_id": result.incident_id,
        "is_new_incident": result.is_new_incident,
        "similarity_score": result.similarity_score,
        "severity_level": result.severity_level,
    }


@celery_worker.task(
    bind=True,
    name="infrastructure.celery.tasks.recalculate_severity_task",
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
)
def recalculate_severity_task(self, incident_id: int) -> dict:
    """
    Celery task: recalculate severity for a given incident.
    Always dispatched after cluster_complaint_task completes.
    Can also be dispatched independently (e.g. on complaint resolution).
    """
    logger.info(f"[recalculate_severity_task] incident_id={incident_id}")

    async def _run():
        async with get_async_db() as db:
            # Build dependencies directly — no container needed
            incident_repo = IncidentRepository(db)
            velocity_detector = DetectVelocitySpikeUseCase(incident_repo)
            use_case = RecalculateSeverityUseCase(
                incident_repository=incident_repo,
                severity_calculator=_severity_calculator,
                velocity_detector=velocity_detector,
            )

            incident = await use_case.execute(incident_id)
            await db.commit()
            return incident

    incident = _run_async(_run())

    return {
        "incident_id": incident.id,
        "severity_score": incident.severity_score,
        "severity_level": incident.severity_level.value,
    }