# app/infrastructure/services/chatbot_service.py
from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.utils.template_renderer import render_template
import os
import nest_asyncio

from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.config.embeddings.gemini_embedding_service import GeminiEmbeddingService
from dotenv import load_dotenv
from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.IEmbeddingService.vector_store.pinecone_rag_repository import PineconeRAGVectorRepository
from app.domain.infrastracture.llm.gemini_rag import GeminiRAGLanguageModel
from app.domain.infrastracture.llm.openai_rag import OpenAIRAGLanguageModel
from app.domain.config.embeddings.openai_embedding import OpenAIEmbeddingService
nest_asyncio.apply()
load_dotenv()
from app.core.config import settings


class ChatbotService:
    def __init__(self, rag_service: RAGService, embedding_service: SentenceTransformerEmbeddingService):
        self._rag = rag_service
        self._embedder = embedding_service

    async def ask(self, question: str) -> RAGResponse:
        embedding = await self._embedder.generate(question)
        return await self._rag.query(question=question, embedding=embedding)
    

"""

def create_chatbot_service() -> ChatbotService:
    return ChatbotService(
        rag_service=RAGService(
            vector_repo=PineconeRAGVectorRepository(
                api_key=os.environ["PINECONE_API_KEY"],
                index_name=os.environ["PINECONE_RAG_INDEX_NAME"],
            ),
            language_model=GeminiRAGLanguageModel(api_key=settings.GEMINI_API_KEY),
        ),
        embedding_service=GeminiEmbeddingService(api_key=settings.GEMINI_API_KEY),
    )
    
"""   
def create_chatbot_service() -> ChatbotService:
    return ChatbotService(
        rag_service=RAGService(
            vector_repo=PineconeRAGVectorRepository(
                api_key=os.environ["PINECONE_API_KEY"],
                index_name=os.environ["PINECONE_RAG_INDEX_NAME"],
            ),
            language_model=OpenAIRAGLanguageModel(api_key=settings.OPEN_AI_API_KEY),
        ),
        embedding_service=OpenAIEmbeddingService(api_key=settings.OPEN_AI_API_KEY),
    )
    
