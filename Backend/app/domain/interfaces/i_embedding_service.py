from abc import ABC, abstractmethod
from typing import List


class IEmbeddingService(ABC):
    """
    ISP: Only one responsibility — turn text into a vector.
    Any embedding backend (local, OpenAI, Cohere) must implement this.
    Use-cases depend on this abstraction, never on concrete implementations.
    """

    @abstractmethod
    async def generate(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the given text.

        Args:
            text: The complaint description or title to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        ...