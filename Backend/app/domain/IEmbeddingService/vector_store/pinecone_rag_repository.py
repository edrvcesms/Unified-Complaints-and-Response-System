# app/infrastructure/vector/pinecone_rag_vector_repository.py
import logging
import math
from typing import List, Optional

from pinecone import Pinecone

from app.domain.interfaces.i_rag_vector_repository import IRAGVectorRepository
from app.domain.value_objects.rag_retrieval_result import RAGRetrievalResult
logger = logging.getLogger(__name__)

# ── Retrieval budget ────────────────────────────────────────────────────────
# Gemini 2.5 Flash context window is large, but the prompt already carries
# the system prompt + user question. We cap chunks here so the LLM receives
# focused, high-signal context rather than a wall of loosely-related text.
#
#   top_k = 5  →  ~5 × 400 tokens ≈ 2 000 tokens of context  (recommended)
#   top_k = 8  →  upper bound for complex multi-part questions
#   top_k = 3  →  minimum for narrow factual lookups
#
# The RAGService always passes an explicit top_k; this default is a safe
# fallback only.
_DEFAULT_TOP_K = 5
_MAX_TOP_K = 8          # Hard ceiling — enforced before every Pinecone call
_SCORE_THRESHOLD = 0.40  # Chunks below this score are dropped even if top_k allows them


class PineconeRAGVectorRepository(IRAGVectorRepository):
    """
    Pinecone-backed implementation of IRAGVectorRepository.

    DIP: Implements IRAGVectorRepository — use-cases never import Pinecone directly.
    OCP: Swap to Weaviate / pgvector by implementing IRAGVectorRepository, rewire DI.
    SRP: Only responsible for vector upsert, retrieval, and local similarity math.
    """

    def __init__(
        self,
        api_key: str,
        index_name: str,
        namespace: str = "",
    ):
        self._pc = Pinecone(api_key=api_key)
        self._index = self._pc.Index(index_name)
        self._namespace = namespace

    # ── Write ───────────────────────────────────────────────────────────────

    async def upsert_chunk(
        self,
        chunk_id: str,
        embedding: List[float],
        text: str,
        source: str,
        metadata: dict,
    ) -> None:
        """Store or update a document chunk in Pinecone."""
        payload = {
            "id": chunk_id,
            "values": embedding,
            "metadata": {
                "text": text,      # stored so we can return raw text on query
                "source": source,
                **metadata,
            },
        }
        try:
            self._index.upsert(vectors=[payload], namespace=self._namespace)
            logger.info(f"Upserted chunk '{chunk_id}' from source '{source}'")
        except Exception as e:
            logger.error(f"Pinecone upsert failed for chunk '{chunk_id}': {e}")
            raise

    # ── Read ────────────────────────────────────────────────────────────────

    async def retrieve_similar_chunks(
        self,
        embedding: List[float],
        top_k: int = _DEFAULT_TOP_K,
        filters: Optional[dict] = None,
    ) -> List[RAGRetrievalResult]:
        """
        Retrieve the most semantically similar chunks for a query embedding.

        top_k is capped at _MAX_TOP_K (8) and filtered by _SCORE_THRESHOLD (0.40)
        so the LLM context stays focused and high-signal.
        """
        safe_top_k = min(top_k, _MAX_TOP_K)

        try:
            response = self._index.query(
                vector=embedding,
                top_k=safe_top_k,
                include_metadata=True,
                namespace=self._namespace,
                filter=filters or {},
            )
        except Exception as e:
            logger.error(f"Pinecone query failed: {e}")
            raise

        results: List[RAGRetrievalResult] = []
        for match in response.matches:
            if match.score < _SCORE_THRESHOLD:
                logger.debug(
                    f"Dropping chunk '{match.id}' — score {match.score:.3f} "
                    f"below threshold {_SCORE_THRESHOLD}"
                )
                continue

            meta = match.metadata or {}
            results.append(
                RAGRetrievalResult(
                    chunk_id=match.id,
                    text=meta.pop("content", ""),
                    source=meta.pop("source", "unknown"),
                    score=match.score,
                    metadata=meta,
                )
            )

        logger.info(
            f"Retrieved {len(results)} chunks (requested top_k={safe_top_k}, "
            f"threshold={_SCORE_THRESHOLD})"
        )
        return results

    async def delete_chunk(self, chunk_id: str) -> None:
        try:
            self._index.delete(ids=[chunk_id], namespace=self._namespace)
            logger.info(f"Deleted chunk '{chunk_id}'")
        except Exception as e:
            logger.error(f"Pinecone delete failed for chunk '{chunk_id}': {e}")
            raise

    async def fetch_chunk_by_id(self, chunk_id: str) -> Optional[RAGRetrievalResult]:
        try:
            response = self._index.fetch(ids=[chunk_id], namespace=self._namespace)
            vector = response.vectors.get(chunk_id)
            if not vector:
                return None
            meta = vector.metadata or {}
            return RAGRetrievalResult(
                chunk_id=chunk_id,
                text=meta.pop("text", ""),
                source=meta.pop("source", "unknown"),
                score=1.0,   # exact fetch — similarity is trivially 1
                metadata=meta,
            )
        except Exception as e:
            logger.error(f"Pinecone fetch failed for chunk '{chunk_id}': {e}")
            raise

    async def fetch_chunks_by_source(self, source: str) -> List[RAGRetrievalResult]:
        """Retrieve all chunks belonging to a source document via metadata filter."""
        try:
            # Pinecone requires a dummy query vector for filtered search;
            # dimension must match your index — adjust if yours differs from 1536.
            dummy_vector = [0.0] * 1536
            response = self._index.query(
                vector=dummy_vector,
                top_k=_MAX_TOP_K,
                include_metadata=True,
                namespace=self._namespace,
                filter={"source": {"$eq": source}},
            )
            results = []
            for match in response.matches:
                meta = match.metadata or {}
                results.append(
                    RAGRetrievalResult(
                        chunk_id=match.id,
                        text=meta.pop("text", ""),
                        source=meta.pop("source", source),
                        score=match.score,
                        metadata=meta,
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Pinecone source fetch failed for '{source}': {e}")
            raise

    # ── Local math ──────────────────────────────────────────────────────────

    def compute_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Cosine similarity computed locally — no network call."""
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        mag_a = math.sqrt(sum(a * a for a in vec_a))
        mag_b = math.sqrt(sum(b * b for b in vec_b))
        if mag_a == 0 or mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)