from typing import List
from google import genai


from app.domain.interfaces.i_embedding_service import IEmbeddingService


class GeminiEmbeddingService(IEmbeddingService):
    """
    Gemini implementation of IEmbeddingService.
    Uses gemini-embedding-001 with RETRIEVAL_QUERY task type
    since this is used at query time (chatbot side).
    """

    def __init__(self, api_key: str, model: str = "gemini-embedding-001"):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def generate(self, text: str) -> List[float]:
        result = self._client.models.embed_content(
            model=self._model,
            contents=text,
        )
        return result.embeddings[0].values