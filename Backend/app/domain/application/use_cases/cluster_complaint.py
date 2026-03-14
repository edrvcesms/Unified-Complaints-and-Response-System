"""
Application Layer — Cluster Complaint Use Case.

SRP: Only responsible for deciding whether to merge a complaint into an
     existing incident or create a new one.
DIP: Depends on domain interfaces only — no SQLAlchemy, no Pinecone imports.
OCP: New clustering strategies (e.g. location-aware) would implement a new
     interface without touching this class.
"""
import asyncio
import logging
import math
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

# Hybrid scoring weights — semantic is dominant, spatial is a proximity signal
_SEMANTIC_WEIGHT = 0.7
_SPATIAL_WEIGHT  = 0.3

# Vector fetch retry settings — guards against Pinecone eventual consistency
_VECTOR_FETCH_RETRIES = 3
_VECTOR_FETCH_RETRY_DELAY_S = 1.0


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
    category_radius_km: float
    latitude: float
    longitude: float
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


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns the great-circle distance in kilometres between two coordinates.
    Uses the Haversine formula — accurate enough for barangay-level distances.
    """
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class ClusterComplaintUseCase:
    """
    Core clustering logic.

    Flow:
    1. Generate embedding for the complaint description.
    2. Query Postgres for active incidents in same barangay+category within time window.
    3. For each candidate incident:
         a. Hard disqualify if distance > category_radius_km (spatial gate).
         b. Fetch seed vector from Pinecone (with retry), compute cosine similarity.
         c. Compute spatial score: 1 - (distance_km / category_radius_km).
         d. Compute hybrid score: 0.7 * semantic + 0.3 * spatial.
    4. Pick candidate with best hybrid score.
    5. Confidence band decision:
         hybrid_score >= threshold + 0.10  → LLM verifies (high confidence, leans YES)
         hybrid_score >= threshold         → LLM verifies (ambiguous zone, leans NO)
         hybrid_score < threshold          → auto reject, new incident
    6. If new incident: upsert seed vector immediately (fixes race condition for
       concurrent complaints arriving before the task completes).
       If merged: upsert complaint vector with resolved incident_id.
    7. Return result (incident_id, is_new, hybrid_score).

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
            f"  Location    : ({data.latitude:.6f}, {data.longitude:.6f})\n"
            f"  Radius      : {data.category_radius_km:.2f} km\n"
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

        # Step 2 — Score each candidate using hybrid semantic + spatial scoring
        best_incident = None
        best_hybrid_score = 0.0
        best_semantic_score = 0.0

        for incident in active_incidents:

            # --- Spatial gate: hard disqualify if outside radius ---
            if incident.latitude is None or incident.longitude is None:
                logger.warning(
                    f"Incident {incident.id} has no location — skipping spatial gate, "
                    f"falling back to semantic-only"
                )
                spatial_score = 0.0
                distance_km = None
            else:
                distance_km = _haversine_km(
                    data.latitude, data.longitude,
                    incident.latitude, incident.longitude,
                )
                if distance_km > data.category_radius_km:
                      # Soft penalty — too far but let semantic decide
                     # Handles cases where reporter is physically far from the incident
                   # (e.g. filing from a different barangay about the same event)
                    logger.info(
                        f"DISQUALIFIED incident_id={incident.id}: "
                        f"distance={distance_km:.4f} km > radius={data.category_radius_km:.2f} km"
                    )
                    spatial_score = 0.0
                spatial_score = 1.0 - (distance_km / data.category_radius_km)

            # --- Semantic score with retry (guards against Pinecone eventual consistency) ---
            incident_vector = None
            for attempt in range(_VECTOR_FETCH_RETRIES):
                incident_vector = await self._vector_repo.fetch_incident_vector(
                    incident_id=incident.id,
                )
                if incident_vector:
                    break
                if attempt < _VECTOR_FETCH_RETRIES - 1:
                    logger.warning(
                        f"Vector not found for incident_id={incident.id}, "
                        f"retrying in {_VECTOR_FETCH_RETRY_DELAY_S}s "
                        f"(attempt {attempt + 1}/{_VECTOR_FETCH_RETRIES})..."
                    )
                    await asyncio.sleep(_VECTOR_FETCH_RETRY_DELAY_S)

            if not incident_vector:
                logger.warning(
                    f"No vector found for incident_id={incident.id} "
                    f"after {_VECTOR_FETCH_RETRIES} attempts, skipping"
                )
                continue

            semantic_score = self._vector_repo.compute_similarity(embedding, incident_vector)

            # --- Hybrid score ---
            hybrid_score = (_SEMANTIC_WEIGHT * semantic_score) + (_SPATIAL_WEIGHT * spatial_score)

            logger.info(
                f"Hybrid score for incident_id={incident.id}:\n"
                f"  Complaint   : '{data.description[:100]}'\n"
                f"  Incident    : '{incident.description[:100]}'\n"
                f"  Semantic    : {semantic_score:.4f} (×{_SEMANTIC_WEIGHT})\n"
                f"  Spatial     : {spatial_score:.4f} (×{_SPATIAL_WEIGHT})"
                + (f" [dist={distance_km:.4f} km]" if distance_km is not None else " [no location]") + "\n"
                f"  Hybrid      : {hybrid_score:.4f} "
                f"(threshold={data.similarity_threshold:.2f}, high={data.similarity_threshold + 0.10:.2f})"
            )

            if hybrid_score > best_hybrid_score:
                best_hybrid_score = hybrid_score
                best_semantic_score = semantic_score
                best_incident = incident

        if best_incident:
            logger.info(
                f"Best candidate → incident_id={best_incident.id}, "
                f"hybrid_score={best_hybrid_score:.4f}"
            )
        else:
            logger.info("No candidate passed spatial gate or scoring — will create new incident")

        # Step 3 — Confidence band decision (driven by hybrid score)
        high_confidence_threshold = data.similarity_threshold + 0.10
        ambiguous_threshold = data.similarity_threshold
        is_match = False

        if best_incident is not None:
            if best_hybrid_score >= high_confidence_threshold:
                logger.info(
                    f"HIGH confidence (hybrid={best_hybrid_score:.4f} >= {high_confidence_threshold:.2f}) — calling LLM\n"
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

            elif best_hybrid_score >= ambiguous_threshold:
                logger.info(
                    f"AMBIGUOUS (hybrid={best_hybrid_score:.4f} >= {ambiguous_threshold:.2f}) — calling LLM\n"
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
                    f"AUTO-REJECT: hybrid={best_hybrid_score:.4f} < threshold={ambiguous_threshold:.2f} "
                    f"— creating new incident"
                )

            logger.info(f"LLM decision: {'MERGE' if is_match else 'NEW INCIDENT'}")

        # Initialize default values for new incidents
        existing_status = "submitted"
        message = "A new incident has been created for your complaint."

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
                similarity_score=best_hybrid_score,
            )

            # Step 4a — Upsert merged complaint vector with resolved incident_id
            try:
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
                    f"Upserted vector for merged complaint_id={data.complaint_id} "
                    f"linked to incident_id={incident.id}"
                )
                
            except Exception as e:
                logger.error(
                    f"Failed to upsert vector for complaint_id={data.complaint_id} "
                    f"after merging into incident_id={incident.id}: {str(e)}"
                )

        else:
            # Step 4b — Create new incident AND upsert seed vector immediately.
            # This prevents a race condition where a concurrent complaint task queries
            # Pinecone for this incident's vector before the end-of-task upsert runs.
            incident = await self._create_new_incident(data=data, embedding=embedding, created_at_unix=created_at_unix)
            similarity_score = 1.0

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
            f"(hybrid_score={similarity_score:.4f}, count={incident.complaint_count})"
        )
        return incident, similarity_score

    async def _create_new_incident(
        self,
        data: ClusterComplaintInput,
        embedding: list,
        created_at_unix: float,
    ) -> IncidentEntity:
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
            latitude=data.latitude,
            longitude=data.longitude,
        )
        created = await self._incident_repo.create(incident)

        cluster = ComplaintClusterEntity(
            id=None,
            incident_id=created.id,
            complaint_id=data.complaint_id,
            similarity_score=1.0,  # Identical — it IS the seed
        )
        await self._incident_repo.link_complaint(cluster)

        # Upsert seed vector immediately — prevents race condition where a concurrent
        # complaint task queries Pinecone for this incident before the parent task finishes.
        await self._vector_repo.upsert(
            complaint_id=data.complaint_id,
            embedding=embedding,
            barangay_id=data.barangay_id,
            category_id=data.category_id,
            incident_id=created.id,
            status="ACTIVE",
            created_at_unix=created_at_unix,
            is_seed=True,  
        )

        logger.info(
            f"New incident {created.id} created from complaint {data.complaint_id} "
            f"at ({data.latitude:.6f}, {data.longitude:.6f}) — seed vector upserted immediately"
        )
        return created