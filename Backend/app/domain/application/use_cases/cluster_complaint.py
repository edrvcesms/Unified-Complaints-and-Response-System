"""
Application Layer — Cluster Complaint Use Case.

SRP: Only responsible for deciding whether to merge a complaint into an
     existing incident or create a new one.
DIP: Depends on domain interfaces only — no SQLAlchemy, no Pinecone imports.
OCP: New clustering strategies (e.g. location-aware) would implement a new
     interface without touching this class.
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from app.domain.entities.complaint_cluster import ComplaintClusterEntity
from app.domain.entities.incident import IncidentEntity
from app.domain.interfaces.i_embedding_service import IEmbeddingService
from app.domain.interfaces.i_incident_repository import IIncidentRepository
from app.domain.interfaces.i_vector_repository import IVectorRepository
from app.domain.value_objects.severity_level import SeverityLevel

logger = logging.getLogger(__name__)


@dataclass
class ClusterComplaintInput:
    """Input DTO for the use case — decouples from request/ORM models."""
    complaint_id: int
    user_id: int
    title: str
    description: str
    barangay_id: int
    category_id: int
    sector_id: Optional[int]
    priority_level_id: Optional[int]
    category_time_window_hours: float
    category_base_severity_weight: float
    similarity_threshold: float
    created_at: datetime


@dataclass
class ClusterComplaintResult:
    """Output DTO returned to the Celery task."""
    incident_id: int
    is_new_incident: bool
    similarity_score: float
    severity_level: str


class ClusterComplaintUseCase:
    """
    Core clustering logic. Executed inside a Celery task.

    Flow:
    1. Generate embedding for the complaint description.
    2. Store embedding in Pinecone with metadata.
    3. Query Pinecone for similar active complaints in same barangay + category
       within the category-specific time window.
    4a. If similar match found and score >= threshold:
          → Link complaint to existing incident.
          → Increment complaint_count.
    4b. If no match:
          → Create new incident from complaint.
    5. Update Pinecone metadata with the resolved incident_id.
    6. Return result (incident_id, is_new, similarity_score).

    Severity recalculation is dispatched as a separate Celery sub-task
    (not done here — SRP).
    """

    def __init__(
        self,
        embedding_service: IEmbeddingService,
        vector_repository: IVectorRepository,
        incident_repository: IIncidentRepository,
    ):
        self._embedding_svc = embedding_service
        self._vector_repo = vector_repository
        self._incident_repo = incident_repository

    async def execute(self, data: ClusterComplaintInput) -> ClusterComplaintResult:
        logger.info(f"Clustering complaint_id={data.complaint_id}")

     
        embedding = await self._embedding_svc.generate(data.description)

        # Store in Pinecone (status=ACTIVE, no incident yet)
        created_at_unix = data.created_at.timestamp()
        await self._vector_repo.upsert(
            complaint_id=data.complaint_id,
            embedding=embedding,
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            incident_id=None,
            status="ACTIVE",
            created_at_unix=created_at_unix,
        )

        # Query for similar complaints
        time_window_cutoff_unix = (
            data.created_at.timestamp() - (data.category_time_window_hours * 3600)
        )
        similar = await self._vector_repo.query_similar(
            embedding=embedding,
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            time_window_cutoff_unix=time_window_cutoff_unix,
            top_k=1,
        )

        # Filter out the complaint's own vector (just upserted)
        similar = [s for s in similar if s.complaint_id != data.complaint_id]

        best_match = similar[0] if similar else None
        is_match = (
            best_match is not None
            and best_match.score >= data.similarity_threshold
            and best_match.incident_id is not None
        )

        if is_match:
            # Merge into existing incident
            incident, similarity_score = await self._merge_into_existing(
                data=data,
                incident_id=best_match.incident_id,
                similarity_score=best_match.score,
            )
        else:
            #Creates a new incident
            incident = await self._create_new_incident(data)
            similarity_score = 1.0  # It IS the incident seed

        # Update Pinecone metadata with resolved incident_id
        await self._vector_repo.update_metadata(
            complaint_id=data.complaint_id,
            incident_id=incident.id,
            status="ACTIVE",
        )

        return ClusterComplaintResult(
            incident_id=incident.id,
            is_new_incident=not is_match,
            similarity_score=similarity_score,
            severity_level=incident.severity_level.value,
        )

 

    async def _merge_into_existing(
        self,
        data: ClusterComplaintInput,
        incident_id: int,
        similarity_score: float,
    ):
        incident = await self._incident_repo.get_by_id(incident_id)
        if not incident or not incident.is_active:
            # Race condition guard: if incident went inactive, create new
            logger.warning(
                f"Incident {incident_id} no longer active. Creating new incident."
            )
            return await self._create_new_incident(data), 0.0

        incident.increment_complaint_count()
        await self._incident_repo.update(incident)

        cluster = ComplaintClusterEntity(
            id=None,
            incident_id=incident.id,
            complaint_id=data.complaint_id,
            similarity_score=similarity_score,
        )
        await self._incident_repo.link_complaint(cluster)

        logger.info(
            f"Complaint {data.complaint_id} merged into incident {incident.id} "
            f"(score={similarity_score:.4f}, count={incident.complaint_count})"
        )
        return incident, similarity_score

    async def _create_new_incident(self, data: ClusterComplaintInput) -> IncidentEntity:
        now = datetime.utcnow()
        incident = IncidentEntity(
            id=None,
            title=data.title,
            description=data.description,
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            sector_id=data.sector_id,
            priority_level_id=data.priority_level_id,
            status="ACTIVE",
            complaint_count=1,
            severity_score=data.category_base_severity_weight,  # seed with base weight
            severity_level=SeverityLevel.from_score(data.category_base_severity_weight),
            time_window_hours=data.category_time_window_hours,
            first_reported_at=now,
            last_reported_at=now,
        )
        created = await self._incident_repo.create(incident)

        # Link the first complaint to this new incident
        cluster = ComplaintClusterEntity(
            id=None,
            incident_id=created.id,
            complaint_id=data.complaint_id,
            similarity_score=1.0,  # Identical — it IS the seed
        )
        await self._incident_repo.link_complaint(cluster)

        logger.info(
            f"New incident {created.id} created from complaint {data.complaint_id}"
        )
        return created