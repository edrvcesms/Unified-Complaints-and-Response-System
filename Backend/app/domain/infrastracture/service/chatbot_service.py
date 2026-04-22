import os
import logging
from dotenv import load_dotenv

from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.IEmbeddingService.vector_store.pinecone_rag_repository import PineconeRAGVectorRepository
from app.domain.infrastracture.llm.openai_rag import OpenAIRAGLanguageModel
from app.domain.config.embeddings.openai_embedding import OpenAIEmbeddingService
from app.services.rag_memory_service import RedisMemoryService
from app.core.config import settings
from app.core.redis import redis_client

load_dotenv()
from app.utils.logger import logger


class ChatbotService:
    def __init__(
        self,
        rag_service: RAGService,
        embedding_service: OpenAIEmbeddingService,
        memory: RedisMemoryService,
    ):
        self._rag = rag_service
        self._embedder = embedding_service
        self._memory = memory

    async def ask(
        self,
        question: str,
        user_id: str,
        session_id: str,
    ) -> RAGResponse:
        # 1. Single pipelined round trip:
        #    - detects if session_id changed
        #    - deletes old session history if it did
        #    - refreshes TTL on active session key
        #    - returns existing history (empty list if new session)
        session_ctx = await self._memory.load_session(user_id, session_id)

        # 2. Generate embedding for the question
        embedding = await self._embedder.generate(question)

        # 3. Query RAG with question, embedding, and history
        result = await self._rag.query(
            question=question,
            embedding=embedding,
            history=session_ctx.history,
        )

        # 4. Append new Q&A pair, trim, and write back to Redis
        await self._memory.save_turn(
            user_id=user_id,
            session_id=session_id,
            question=question,
            answer=result.answer,
            current_history=session_ctx.history,
        )

        return result


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

    memory = RedisMemoryService(client=redis_client)

    return ChatbotService(
        rag_service=rag_service,
        embedding_service=embedding_service,
        memory=memory,
    )