import os
from app.core.config import settings
from app.database.database import AsyncSessionLocal
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.infrastracture.jobs.resolve_expired_incidents import resolve_expired_incidents

_vector_repository = None

def get_vector_repository():
    global _vector_repository
    if _vector_repository is None:
        _vector_repository = PineconeVectorRepository(
            api_key=settings.PINECONE_API_KEY,
            environment=settings.PINECONE_ENVIRONMENT,
        )
    return _vector_repository

async def run_resolve_expired_incidents():
    async with AsyncSessionLocal() as db:
        expired_ids = await resolve_expired_incidents(db)
        if expired_ids:
            vector_repo = get_vector_repository()
            for incident_id in expired_ids:
                await vector_repo.update_status_by_incident(
                    incident_id=incident_id,
                    status="EXPIRED",
                )