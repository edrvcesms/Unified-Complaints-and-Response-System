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
from typing import Optional

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
    existing_incident_status: Optional[str] = None  # e.g., "under_review", "submitted"
    message: Optional[str] = None  # Message to display to the user


class ClusterComplaintUseCase:
    """
    Core clustering logic.

    Flow:
    1. Generate embedding for the complaint description.
    2. Query Postgres for active incidents in same barangay+category within time window.
    3. For each candidate incident, fetch its seed vector from Pinecone and compute
       cosine similarity locally.
    4. Confidence band decision:
         score >= threshold + 0.10  → LLM verifies (high confidence, leans YES)
         score >= threshold         → LLM verifies (ambiguous zone, leans NO)
         score < threshold          → auto reject, new incident
    5. Upsert complaint vector into Pinecone with resolved incident_id.
    6. Return result (incident_id, is_new, similarity_score).

    Postgres is the source of truth for candidate discovery.
    Pinecone is used only for vector storage and retrieval.
    LLM is called for all candidates above threshold.
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
        logger.info(
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Clustering complaint_id={data.complaint_id}\n"
            f"  Description : '{data.description[:120]}'\n"
            f"  Barangay    : {data.barangay_id}\n"
            f"  Category    : {data.category_id}\n"
            f"  Threshold   : {data.similarity_threshold:.2f} | High: {data.similarity_threshold + 0.10:.2f}"
        )

        embedding = await self._embedding_svc.generate(data.description)
        created_at_unix = data.created_at.timestamp()

        # Step 1 — Query Postgres for active incidents in same barangay+category+window
        active_incidents = await self._incident_repo.get_active_incidents_in_window(
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            time_window_hours=data.category_time_window_hours,
        )
        logger.info(f"Found {len(active_incidents)} active incident(s) in window")

        # Step 2 — Score each incident using local cosine similarity
        best_incident = None
        best_score = 0.0

        for incident in active_incidents:
            incident_vector = await self._vector_repo.fetch_incident_vector(
               incident_id=incident.id,
    )
            if not incident_vector:
                logger.warning(f"No vector found for incident_id={incident.id}, skipping")
                continue

            score = self._vector_repo.compute_similarity(embedding, incident_vector)

            logger.info(
                f"Similarity check:\n"
                f"  New complaint   : '{data.description[:100]}'\n"
                f"  Incident {incident.id:>4}    : '{incident.description[:100]}'\n"
                f"  Score           : {score:.4f} "
                f"(threshold={data.similarity_threshold:.2f}, high={data.similarity_threshold + 0.10:.2f})"
            )

            if score > best_score:
                best_score = score
                best_incident = incident

        if best_incident:
            logger.info(
                f"Best candidate → incident_id={best_incident.id}, "
                f"score={best_score:.4f}"
            )
        else:
            logger.info("No candidate found — will create new incident")

        # Step 3 — Confidence band decision
        high_confidence_threshold = data.similarity_threshold + 0.10
        ambiguous_threshold = data.similarity_threshold
        is_match = False

        if best_incident is not None:
            if best_score >= high_confidence_threshold:
                logger.info(
                    f"HIGH confidence (score={best_score:.4f} >= {high_confidence_threshold:.2f}) — calling LLM\n"
                    f"  A (incident {best_incident.id}): '{best_incident.description[:120]}'\n"
                    f"  B (new complaint): '{data.description[:120]}'"
                )
                is_match = await self._verifier.is_same_incident(
                    complaint_a=best_incident.description,
                    complaint_b=data.description,
                )
                logger.info(
                    f"LLM verdict (HIGH): "
                    f"{'✓ MERGE → incident_id=' + str(best_incident.id) if is_match else '✗ NEW INCIDENT'}"
                )

            elif best_score >= ambiguous_threshold:
                logger.info(
                    f"AMBIGUOUS (score={best_score:.4f} >= {ambiguous_threshold:.2f}) — calling LLM\n"
                    f"  A (incident {best_incident.id}): '{best_incident.description[:120]}'\n"
                    f"  B (new complaint): '{data.description[:120]}'"
                )
                is_match = await self._verifier.is_same_incident(
                    complaint_a=best_incident.description,
                    complaint_b=data.description,
                )
                logger.info(
                    f"LLM verdict (AMBIGUOUS): "
                    f"{'✓ MERGE → incident_id=' + str(best_incident.id) if is_match else '✗ NEW INCIDENT'}"
                )

            else:
                logger.info(
                    f"AUTO-REJECT: score={best_score:.4f} < threshold={ambiguous_threshold:.2f} "
                    f"— creating new incident"
                )

            logger.info(f"LLM decision: {'MERGE' if is_match else 'NEW INCIDENT'}")

        if is_match:
            # Check existing complaint statuses before merging
            statuses = await self._incident_repo.get_incident_complaint_statuses(best_incident.id)
            logger.info(f"Existing incident {best_incident.id} has complaint statuses: {statuses}")
            
            # Determine the highest priority status
            if "under_review" in statuses:
                existing_status = "under_review"
                message = "This incident is already under review by the barangay admin."
            elif "forwarded_to_lgu" in statuses:
                existing_status = "forwarded_to_lgu"
                message = "This incident has already been forwarded to the LGU for action."
            elif "forwarded_to_department" in statuses:
                existing_status = "forwarded_to_department"
                message = "This incident has already been forwarded to the department for action."
            elif "resolved" in statuses:
                existing_status = "resolved"
                message = "This incident has already been resolved."
            elif len(statuses) > 0 and all(s == "submitted" for s in statuses):
                existing_status = "submitted"
                message = "Similar complaints have already been submitted for this incident."
            else:
                existing_status = statuses[0] if statuses else "submitted"
                message = "This complaint has been merged with an existing incident."
            
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

        logger.info(
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"Clustering complete for complaint_id={data.complaint_id}\n"
            f"  Result      : {'MERGED' if is_match else 'NEW INCIDENT'}\n"
            f"  Incident ID : {incident.id}\n"
            f"  Score       : {similarity_score:.4f}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )

        return ClusterComplaintResult(
            incident_id=incident.id,
            is_new_incident=not is_match,
            similarity_score=similarity_score,
            severity_level=incident.severity_level.value,
            existing_incident_status=existing_status,
            message=message,
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
            severity_score=data.category_base_severity_weight,
            severity_level=SeverityLevel.from_score(data.category_base_severity_weight),
            time_window_hours=data.category_time_window_hours,
            first_reported_at=now,
            last_reported_at=now,
        )
        created = await self._incident_repo.create(incident)

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