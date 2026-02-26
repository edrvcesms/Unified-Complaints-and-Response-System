from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.value_objects.similarity_result import SimilarityResult


class IVectorRepository(ABC):
    """
    ISP: Handles only vector storage and similarity search operations.
    Concrete implementations can be Pinecone, Weaviate, pgvector, etc.
    Use-cases never import pinecone directly — only this interface.
    """

    @abstractmethod
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
        Store or update a complaint's vector in the vector store.
        Metadata stored alongside the vector enables filtered similarity search.
        """
        ...

    @abstractmethod
    async def query_similar(
        self,
        embedding: List[float],
        barangay_id: int,
        category_id: int,
        time_window_cutoff_unix: float,
        top_k: int = 1,
    ) -> List[SimilarityResult]:
        """
        Find the most similar active complaints within the same barangay,
        category, and time window using cosine similarity.

        Args:
            embedding: The query vector from the new complaint.
            barangay_id: Filter to same barangay only.
            category_id: Filter to same category only.
            time_window_cutoff_unix: Unix timestamp lower bound (category-specific window).
            top_k: Number of nearest neighbors to return.

        Returns:
            List of SimilarityResult ordered by similarity score descending.
        """
        ...

    @abstractmethod
    async def update_metadata(
        self,
        complaint_id: int,
        incident_id: int,
        status: str,
    ) -> None:
        """
        Update the incident_id and status metadata for an existing vector.
        Called after a complaint is linked to a new or existing incident.
        """
        ...
    
    @abstractmethod  
    async def fetch_incident_vector(self, incident_id: int) -> list[float] | None:
      ...
    
    @abstractmethod
    def compute_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
      ... 
      
    @abstractmethod
    async def update_status_by_incident(self, incident_id: int, status: str) -> None:
      ...
      
    @abstractmethod
    async def fetch_incident_vectors_batch(
    self, incident_ids: list[int]
) -> dict[int, list[float]]:
      ...