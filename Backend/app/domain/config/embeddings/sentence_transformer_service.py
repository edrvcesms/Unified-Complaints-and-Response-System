"""
Infrastructure Layer — Sentence Transformer Embedding Service.

Implements IEmbeddingService using multilingual-e5-large model.
Model is loaded once as a singleton to avoid repeated disk I/O.
"""

import asyncio
import logging
from functools import lru_cache
from typing import List
import psutil
import os

from sentence_transformers import SentenceTransformer
import torch

from app.domain.interfaces.i_embedding_service import IEmbeddingService

logger = logging.getLogger(__name__)

MODEL_NAME = "intfloat/multilingual-e5-large"
EMBEDDING_DIM = 1024


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    # Detect GPU availability
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    # Track memory before loading model
    process = psutil.Process(os.getpid())
    cpu_memory_before = process.memory_info().rss / 1024**2  # MB
    
    logger.info(f"Loading embedding model: {MODEL_NAME} on device: {device}")
    logger.info(f"CPU Memory before loading model: {cpu_memory_before:.2f} MB")
    
    model = SentenceTransformer(MODEL_NAME, device=device)
    
    # Track memory after loading model
    cpu_memory_after = process.memory_info().rss / 1024**2  # MB
    cpu_memory_used = cpu_memory_after - cpu_memory_before
    
    if device == 'cuda':
        gpu_memory_used = torch.cuda.memory_allocated(0) / 1024**2  # MB
        logger.info(f"✓ Model loaded on GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"✓ GPU Memory used by model: {gpu_memory_used:.2f} MB")
        logger.info(f"✓ CPU Memory used by model: {cpu_memory_used:.2f} MB")
        logger.info(f"✓ Memory saved by using GPU: ~{gpu_memory_used - cpu_memory_used:.2f} MB moved from CPU to GPU")
    else:
        logger.info("GPU not available, using CPU")
        logger.info(f"CPU Memory used by model: {cpu_memory_used:.2f} MB")
    
    return model


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