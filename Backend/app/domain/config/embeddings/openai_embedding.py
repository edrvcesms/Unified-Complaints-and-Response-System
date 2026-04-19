from typing import List
from openai import AsyncOpenAI

from app.domain.interfaces.i_embedding_service import IEmbeddingService


class OpenAIEmbeddingService(IEmbeddingService):
    """
    OpenAI implementation of IEmbeddingService.
    Uses text-embedding-3-large which supports 90+ languages including
    Tagalog and English with cross-lingual semantic alignment.
    Async client used since this runs at query time (chatbot side).
    """

    def __init__(self, api_key: str, model: str = "text-embedding-3-large"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate(self, text: str) -> List[float]:
        result = await self._client.embeddings.create(
            model=self._model,
            input=text,
            dimensions=1024
        )
        return result.data[0].embedding