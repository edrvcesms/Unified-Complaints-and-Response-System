# app/infrastructure/services/chatbot_service.py
import logging
from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
    

class ChatbotService:
    def __init__(self, rag_service: RAGService, embedding_service: SentenceTransformerEmbeddingService):
        self._rag = rag_service
        self._embedder = embedding_service

    async def ask(self, question: str) -> RAGResponse:
        embedding = await self._embedder.generate(question)
        return await self._rag.query(question=question, embedding=embedding)