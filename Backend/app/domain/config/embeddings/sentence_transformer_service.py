"""
Infrastructure Layer — Sentence Transformer Embedding Service.

Implements IEmbeddingService using multilingual-e5-large model.
Model is loaded once as a singleton to avoid repeated disk I/O.
"""

import asyncio
import logging
from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer

from app.domain.interfaces.i_embedding_service import IEmbeddingService

logger = logging.getLogger(__name__)

MODEL_NAME = "intfloat/multilingual-e5-large"
EMBEDDING_DIM = 1024


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    logger.info(f"Loading embedding model: {MODEL_NAME}")
    return SentenceTransformer(MODEL_NAME)


class SentenceTransformerEmbeddingService(IEmbeddingService):

    def __init__(self):
        self._model: SentenceTransformer = None

    async def generate(self, text: str, prefix: str = "query: ") -> List[float]:
        """
        Generate embedding vector.

        Parameters
        ----------
        text : str
            Input text.
        prefix : str
            E5 models require task prefix:
            - "query: " for search queries
            - "passage: " for stored documents
        """

        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty text")

        model = self._get_model()

        processed_text = f"{prefix}{text.strip()}"

        loop = asyncio.get_event_loop()

        embedding = await loop.run_in_executor(
            None,
            lambda: model.encode(
                processed_text,
                normalize_embeddings=True
            ).tolist()
        )

        if len(embedding) != EMBEDDING_DIM:
            logger.warning(
                f"Embedding dimension mismatch: expected {EMBEDDING_DIM}, got {len(embedding)}"
            )

        return embedding

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = _load_model()
        return self._model