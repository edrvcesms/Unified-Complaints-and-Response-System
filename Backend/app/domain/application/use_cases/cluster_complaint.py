"""
Application Layer — Cluster Complaint Use Case.

SRP: Only responsible for deciding whether to merge a complaint into an
     existing incident or create a new one.
DIP: Depends on domain interfaces only — no SQLAlchemy, no Pinecone imports.
OCP: New clustering strategies (e.g. location-aware) would implement a new
     interface without touching this class.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

from app.domain.entities.complaint_cluster import ComplaintClusterEntity
from app.domain.entities.incident import IncidentEntity
from app.domain.interfaces.i_embedding_service import IEmbeddingService
from app.domain.interfaces.i_incident_repository import IIncidentRepository
from app.domain.interfaces.i_incident_verifier import IIncidentVerifier
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
    category_time_window_hours: float
    category_base_severity_weight: float
    similarity_threshold: float
    created_at: datetime


@dataclass
class ClusterComplaintResult:
    """Output DTO returned to the service."""
    incident_id: int
    is_new_incident: bool
    similarity_score: float
    severity_level: str


class ClusterComplaintUseCase:
    """
    Core clustering logic.

    Flow:
    1. Generate embedding for the complaint description.
    2. Query Postgres for active incidents in same barangay+category within time window.
    3. For each candidate incident, fetch its seed vector from Pinecone and compute
       cosine similarity locally.
    4. Confidence band decision:
         score >= threshold + 0.10  → LLM verifies with HIGH confidence (leans YES)
         score >= threshold         → LLM verifies with LOW confidence (leans NO)
         score < threshold          → auto reject, new incident
    5. Upsert complaint vector into Pinecone with resolved incident_id.
    6. Return result (incident_id, is_new, similarity_score).

    Postgres is the source of truth for candidate discovery.
    Pinecone is used only for vector storage and retrieval.
    LLM is called for all candidates above threshold with confidence-aware prompting.
    Severity recalculation is handled separately (SRP).
    """

    def __init__(
        self,
        embedding_service: IEmbeddingService,
        vector_repository: IVectorRepository,
        incident_repository: IIncidentRepository,
        incident_verifier: IIncidentVerifier,
    ):
        self._embedding_svc = embedding_service
        self._vector_repo = vector_repository
        self._incident_repo = incident_repository
        self._verifier = incident_verifier

    async def execute(self, data: ClusterComplaintInput) -> ClusterComplaintResult:
        logger.info(f"Clustering complaint_id={data.complaint_id}")

        embedding = await self._embedding_svc.generate(data.description)
        created_at_unix = data.created_at.timestamp()

        # Step 1 — Query Postgres for active incidents in same barangay+category+window
        active_incidents = await self._incident_repo.get_active_incidents_in_window(
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            time_window_hours=data.category_time_window_hours,
        )
        logger.info(f"Found {len(active_incidents)} active incidents in window")

        # Step 2 — Score each incident using local cosine similarity
        best_incident = None
        best_score = 0.0

        for incident in active_incidents:
            incident_vector = await self._vector_repo.fetch_incident_vector(incident.id)
            if not incident_vector:
                continue

            score = self._vector_repo.compute_similarity(embedding, incident_vector)
            logger.info(f"Incident {incident.id} similarity score: {score:.4f}")

            if score > best_score:
                best_score = score
                best_incident = incident

        # Step 3 — Confidence band decision
        high_confidence_threshold = data.similarity_threshold + 0.10
        ambiguous_threshold = data.similarity_threshold
        is_match = False

        if best_incident is not None:
            if best_score >= high_confidence_threshold:
                # High confidence — LLM verifies but leans YES
                # Only rejects if subject or location is clearly different
                logger.info(
                    f"High confidence score={best_score:.4f} >= {high_confidence_threshold:.2f}, "
                    f"calling LLM verifier (HIGH)"
                )
                is_match = await self._verifier.is_same_incident(
                    complaint_a=best_incident.description,
                    complaint_b=data.description,
                  
                )

            elif best_score >= ambiguous_threshold:
                # Ambiguous zone — LLM verifies and leans NO
                # Only merges if subject and location clearly match
                logger.info(
                    f"Ambiguous score={best_score:.4f} >= {ambiguous_threshold:.2f}, "
                    f"calling LLM verifier (LOW)"
                )
                is_match = await self._verifier.is_same_incident(
                    complaint_a=best_incident.description,
                    complaint_b=data.description,
                    
                )

            else:
                # Clear non-match — below threshold
                logger.info(
                    f"Auto-reject: score={best_score:.4f} < {ambiguous_threshold:.2f}"
                )

            logger.info(f"LLM decision: {'MERGE' if is_match else 'NEW INCIDENT'}")

        if is_match:
            incident, similarity_score = await self._merge_into_existing(
                data=data,
                incident_id=best_incident.id,
                similarity_score=best_score,
            )
        else:
            incident = await self._create_new_incident(data)
            similarity_score = 1.0

        # Step 4 — Upsert complaint vector with resolved incident_id
        await self._vector_repo.upsert(
            complaint_id=data.complaint_id,
            embedding=embedding,
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            incident_id=incident.id,
            status="ACTIVE",
            created_at_unix=created_at_unix,
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