# app/infrastructure/services/rag_service.py
import logging
from dataclasses import dataclass
from typing import List, Optional

from app.domain.interfaces.i_rag_model import IRAGLanguageModel
from app.domain.interfaces.i_rag_vector_repository import IRAGVectorRepository
from app.domain.value_objects.rag_retrieval_result import RAGRetrievalResult

logger = logging.getLogger(__name__)


@dataclass
class RAGResponse:
    answer: str
    sources: List[RAGRetrievalResult]
    is_grounded: bool


class RAGService:
    _MAX_CONTEXT_CHUNKS: int = 6
    _DEFAULT_TOP_K: int = 5

    def __init__(
        self,
        vector_repo: IRAGVectorRepository,
        language_model: IRAGLanguageModel,
    ):
        self._vector_repo = vector_repo
        self._language_model = language_model

    async def query(
        self,
        question: str,
        embedding: List[float],
        *,
        top_k: int = _DEFAULT_TOP_K,
        filters: Optional[dict] = None,
    ) -> RAGResponse:
        chunks: List[RAGRetrievalResult] = await self._vector_repo.retrieve_similar_chunks(
            embedding=embedding,
            top_k=top_k,
            filters=filters,
        )

        if not chunks:
            logger.warning("No chunks above threshold — falling back to Gemini general response.")
            answer = await self._language_model.generate_answer(
                question=question,
                context=[],
            )
            return RAGResponse(answer=answer, sources=[], is_grounded=False)

        context_chunks = chunks[: self._MAX_CONTEXT_CHUNKS]
        context_texts = [chunk.text for chunk in context_chunks]
        answer = await self._language_model.generate_answer(
            question=question,
            context=context_texts,
        )
        return RAGResponse(answer=answer, sources=context_chunks, is_grounded=True)

 