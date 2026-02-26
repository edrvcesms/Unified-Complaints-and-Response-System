"""
Infrastructure Layer — Pinecone Vector Repository.

Implements IVectorRepository using the Pinecone SDK.
All Pinecone-specific logic is isolated here.
OCP: Switching to a different vector DB = implement IVectorRepository, rewire DI.
     No use-case code changes required.
"""

import logging
from typing import List, Optional

import numpy as np
from pinecone import Pinecone, ServerlessSpec

from app.domain.interfaces.i_vector_repository import IVectorRepository
from app.domain.value_objects.similarity_result import SimilarityResult

logger = logging.getLogger(__name__)


class PineconeVectorRepository(IVectorRepository):
    """
    Pinecone implementation of IVectorRepository.

    Index design:
      - name: complaints-index
      - dimension: 1024
      - metric: cosine
      - metadata: complaint_id, barangay_id, category_id, incident_id, status, created_at

    DIP: Use-cases depend on IVectorRepository, not this class.
    SRP: Only handles vector storage and similarity queries.
    """

    INDEX_NAME = "complaints-index"
    DIMENSION = 1024
    METRIC = "cosine"

    def __init__(self, api_key: str, environment: str = "us-east-1"):
        self._pc = Pinecone(api_key=api_key)
        self._environment = environment
        self._index = None

    async def initialize(self) -> None:
        """
        Ensure the Pinecone index exists. Called once at application startup.
        Creates the index if it doesn't exist yet.
        """
        existing = [i.name for i in self._pc.list_indexes()]
        if self.INDEX_NAME not in existing:
            logger.info(f"Creating Pinecone index: {self.INDEX_NAME}")
            self._pc.create_index(
                name=self.INDEX_NAME,
                dimension=self.DIMENSION,
                metric=self.METRIC,
                spec=ServerlessSpec(
                    cloud="aws",
                    region=self._environment,
                ),
            )
        self._index = self._pc.Index(self.INDEX_NAME)
        logger.info(f"Pinecone index ready: {self.INDEX_NAME}")

    def _get_index(self):
        if self._index is None:
            self._index = self._pc.Index(self.INDEX_NAME)
        return self._index

    async def upsert(
        self,
        complaint_id: int,
        embedding: List[float],
        barangay_id: int,
        category_id: int,
        incident_id: Optional[int],
        status: str,
        created_at_unix: float,
    ) -> None:
        """
        Store a complaint's embedding in Pinecone with filterable metadata.
        Vector ID is the complaint_id (as string — Pinecone requires string IDs).
        """
        index = self._get_index()

        metadata = {
            "complaint_id": complaint_id,
            "barangay_id": barangay_id,
            "category_id": category_id,
            "incident_id": incident_id if incident_id is not None else -1,
            "status": status,
            "created_at": created_at_unix,
        }

        index.upsert(vectors=[{
            "id": str(complaint_id),
            "values": embedding,
            "metadata": metadata,
        }])

        logger.debug(f"Upserted vector for complaint_id={complaint_id} into Pinecone")

    async def query_similar(
        self,
        embedding: List[float],
        barangay_id: int,
        category_id: int,
        time_window_cutoff_unix: float,
        top_k: int = 1,
    ) -> List[SimilarityResult]:
        """
        Query Pinecone for the most similar active complaint within the same
        barangay, category, and time window.
        """
        index = self._get_index()

        results = index.query(
            vector=embedding,
            top_k=top_k,
            filter={
                "barangay_id": {"$eq": barangay_id},
                "category_id": {"$eq": category_id},
                "status": {"$eq": "ACTIVE"},
                "created_at": {"$gte": time_window_cutoff_unix},
            },
            include_metadata=True,
        )

        matches = results.get("matches", [])
        if not matches:
            logger.debug(
                f"No similar complaints found for barangay={barangay_id}, category={category_id}"
            )
            return []

        return [
            SimilarityResult(
                complaint_id=int(m["metadata"]["complaint_id"]),
                incident_id=int(m["metadata"]["incident_id"]) if m["metadata"].get("incident_id", -1) != -1 else None,
                score=float(m["score"]),
                barangay_id=int(m["metadata"]["barangay_id"]),
                category_id=int(m["metadata"]["category_id"]),
                status=m["metadata"]["status"],
                created_at_unix=float(m["metadata"]["created_at"]),
            )
            for m in matches
        ]

    async def update_metadata(
        self,
        complaint_id: int,
        incident_id: int,
        status: str,
    ) -> None:
        """
        Update incident_id and status metadata for an existing vector.
        Called after a complaint is linked to an incident.
        """
        index = self._get_index()
        index.update(
            id=str(complaint_id),
            set_metadata={
                "incident_id": incident_id,
                "status": status,
            },
        )
        logger.debug(
            f"Updated metadata for complaint_id={complaint_id}: "
            f"incident_id={incident_id}, status={status}"
        )

    async def fetch_incident_vector(
    self,
    incident_id: int,
) -> list[float] | None:
       """Fetch incident vector by querying metadata filter."""
       try:
          index = self._get_index()
          result = index.query(
            vector=[0.0] * self.DIMENSION,
            filter={
                "incident_id": {"$eq": incident_id},
            },
            top_k=1,
            include_values=True,
        )
          matches = result.get("matches", [])
          if not matches:
            logger.warning(f"No vector found for incident_id={incident_id}")
            return None
          logger.info(f"Fetched vector for incident_id={incident_id}, vector_id={matches[0]['id']}")
          return matches[0]["values"]
       except Exception as e:
        logger.error(f"Error fetching vector for incident_id={incident_id}: {e}")
        return None

    async def fetch_incident_vectors_batch(
        self,
        incident_ids: list[int],
    ) -> dict[int, list[float]]:
        """Fetch seed vectors for multiple incidents in one Pinecone call."""
        if not incident_ids:
            return {}
        try:
            index = self._get_index()
            result = index.fetch(ids=[str(i) for i in incident_ids])
            vectors = result.get("vectors", {})
            return {
                int(vec_id): vec_data["values"]
                for vec_id, vec_data in vectors.items()
                if "values" in vec_data
            }
        except Exception as e:
            logger.error(f"Batch fetch failed: {e}")
            return {}

    def compute_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Cosine similarity between two vectors, computed locally."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        if denom == 0:
            return 0.0
        return float(np.dot(a, b) / denom)

    async def update_status_by_incident(self, incident_id: int, status: str) -> None:
        """
        Update status metadata for all complaint vectors linked to an incident.
        Called when an incident expires.
        """
        index = self._get_index()

        results = index.query(
            vector=[0.0] * self.DIMENSION,
            filter={"incident_id": {"$eq": incident_id}},
            top_k=1000,
            include_metadata=True,
        )

        matches = results.get("matches", [])
        if not matches:
            logger.debug(f"No vectors found for incident_id={incident_id}")
            return

        for match in matches:
            index.update(
                id=match["id"],
                set_metadata={"status": status},
            )

        logger.info(
            f"Updated {len(matches)} vectors to status={status} "
            f"for incident_id={incident_id}"
        )
        
        