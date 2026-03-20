from abc import ABC, abstractmethod
from typing import List
from app.domain.value_objects.rag_retrieval_result import RAGRetrievalResult


class IRAGVectorRepository(ABC):
    """
    Domain interface for vector storage and similarity search in a RAG pipeline.

    ISP: Handles only document chunk storage and retrieval operations.
    DIP: Use-cases depend on this abstraction, not a concrete vector DB implementation.
    OCP: Concrete implementations can be Pinecone, Weaviate, pgvector, ChromaDB, etc.
    """

    @abstractmethod
    async def upsert_chunk(
        self,
        chunk_id: str,
        embedding: List[float],
        text: str,
        source: str,
        metadata: dict,
    ) -> None:
        """
        Store or update a document chunk's vector in the vector store.

        Args:
            chunk_id:  Unique identifier for this chunk (e.g. "doc_42_chunk_3").
            embedding: The dense vector representation of the chunk text.
            text:      The raw chunk text, stored as metadata for retrieval.
            source:    Origin of the document (e.g. file path, URL, document title).
            metadata:  Arbitrary key-value pairs for filtered retrieval (e.g. category, date).
        """
        ...

    @abstractmethod
    async def retrieve_similar_chunks(
        self,
        embedding: List[float],
        top_k: int = 5,
        filters: dict | None = None,
    ) -> List[RAGRetrievalResult]:
        """
        Find the most semantically similar chunks to the query embedding.

        Args:
            embedding: The query vector derived from the user's question.
            top_k:     Number of nearest neighbors to return.
            filters:   Optional metadata filters (e.g. {"category": "ordinance"}).

        Returns:
            List of RAGRetrievalResult ordered by similarity score descending.
        """
        ...

    @abstractmethod
    async def delete_chunk(self, chunk_id: str) -> None:
        """
        Remove a document chunk from the vector store.
        Called when a source document is deleted or re-indexed.
        """
        ...

    @abstractmethod
    async def fetch_chunk_by_id(self, chunk_id: str) -> RAGRetrievalResult | None:
        """
        Retrieve a specific chunk by its ID.
        Useful for exact lookup without similarity search.
        """
        ...

    @abstractmethod
    async def fetch_chunks_by_source(self, source: str) -> List[RAGRetrievalResult]:
        """
        Retrieve all chunks belonging to a specific source document.
        Useful for re-indexing or auditing a document's stored chunks.
        """
        ...

    @abstractmethod
    def compute_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Compute cosine similarity between two vectors locally (no network call).
        Used for reranking or threshold checks after retrieval.
        """
        ...