from abc import ABC, abstractmethod


class IRAGLanguageModel(ABC):
    """
    Domain interface for the LLM component in a RAG pipeline.

    SRP: Only responsible for generating an answer given a question and retrieved context.
    DIP: Use-cases depend on this abstraction, not a concrete LLM implementation.
    OCP: New models (GPT, Gemini, Claude) can be added without touching use-case code.
    """

    @abstractmethod
    async def generate_answer(
        self,
        question: str,
        context: list[str],
    ) -> str:
        """
        Generates an answer to `question` grounded in the provided `context` chunks.

        Args:
            question: The natural-language question from the user.
            context:  List of retrieved document chunks to use as grounding context.

        Returns:
            A natural-language answer grounded in the provided context.
        """

    @abstractmethod
    async def generate_no_context_answer(self, question: str) -> str:
        """
        Generates a polite fallback answer when no relevant chunks were retrieved.

        Args:
            question: The natural-language question from the user.

        Returns:
            A natural-language response informing the resident no information
            was found, and directing them to their barangay or munisipyo.
        """