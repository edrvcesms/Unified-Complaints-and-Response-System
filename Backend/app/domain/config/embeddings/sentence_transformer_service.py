"""
Infrastructure Layer — Sentence Transformer Embedding Service.

Implements IEmbeddingService using the local all-MiniLM-L6-v2 model.
Model is loaded once as a singleton to avoid repeated disk I/O.
LSP: Can be replaced by OpenAIEmbeddingService or CohereEmbeddingService
     without any changes to use-cases.
"""

import asyncio
import logging
from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer

from app.domain.interfaces.i_embedding_service import IEmbeddingService

logger = logging.getLogger(__name__)

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
EMBEDDING_DIM = 384


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    """
    Load and cache the model once per process.
    lru_cache ensures the model is not reloaded on every request.
    """
    logger.info(f"Loading sentence-transformer model: {MODEL_NAME}")
    return SentenceTransformer(MODEL_NAME)


class SentenceTransformerEmbeddingService(IEmbeddingService):
    """
    Generates 384-dimensional embeddings using all-MiniLM-L6-v2.

    SRP: Only responsibility is embedding generation.
    DIP: Use-cases import IEmbeddingService, not this class directly.
    """

    def __init__(self):
        # Model is loaded lazily on first call, then cached
        self._model: SentenceTransformer = None

    async def generate(self, text: str) -> List[float]:
        """
        Generate an embedding vector for the given text.
        Runs the CPU-bound encoding in a thread pool to avoid blocking the event loop.
        """
        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty text")

        model = self._get_model()

        # Run blocking CPU-bound work in a thread pool
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None,
            lambda: model.encode(text.strip(), normalize_embeddings=True).tolist()
        )

        logger.debug(f"Generated embedding of dim={len(embedding)} for text length={len(text)}")
        return embedding

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = _load_model()
        return self._model