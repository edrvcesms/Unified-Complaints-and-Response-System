# app/infrastructure/services/chatbot_service.py
from app.domain.chatbot.rag_service import RAGService, RAGResponse
import os
from dotenv import load_dotenv
from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.IEmbeddingService.vector_store.pinecone_rag_repository import PineconeRAGVectorRepository
from app.domain.infrastracture.llm.openai_rag import OpenAIRAGLanguageModel
from app.domain.config.embeddings.openai_embedding import OpenAIEmbeddingService
load_dotenv()
from app.core.config import settings


class ChatbotService:
    def __init__(self, rag_service: RAGService, embedding_service: OpenAIEmbeddingService):
        self._rag = rag_service
        self._embedder = embedding_service

    async def ask(self, question: str) -> RAGResponse:
        embedding = await self._embedder.generate(question)
        return await self._rag.query(question=question, embedding=embedding)
    

def create_chatbot_service() -> ChatbotService:
    pinecone_repo = PineconeRAGVectorRepository(
        api_key=os.environ["PINECONE_API_KEY"],
        index_name=os.environ["PINECONE_RAG_INDEX_NAME"],
    )

    language_model = OpenAIRAGLanguageModel(api_key=settings.OPEN_AI_API_KEY)

    embedding_service = OpenAIEmbeddingService(api_key=settings.OPEN_AI_API_KEY)

    rag_service = RAGService(
        vector_repo=pinecone_repo,
        language_model=language_model,
    )

    return ChatbotService(
        rag_service=rag_service,
        embedding_service=embedding_service,
    )