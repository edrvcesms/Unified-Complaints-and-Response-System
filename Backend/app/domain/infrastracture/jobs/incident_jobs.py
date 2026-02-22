import os
from app.core.config import settings
from app.database.database import AsyncSessionLocal
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.infrastracture.jobs.resolve_expired_incidents import resolve_expired_incidents

_vector_repository = PineconeVectorRepository(
    api_key=settings.PINECONE_API_KEY,
    environment=settings.PINECONE_ENVIRONMENT,
)

async def run_resolve_expired_incidents():
    async with AsyncSessionLocal() as db:
        expired_ids = await resolve_expired_incidents(db)
        if expired_ids:
            for incident_id in expired_ids:
                await _vector_repository.update_status_by_incident(
                    incident_id=incident_id,
                    status="EXPIRED",
                )