from abc import ABC, abstractmethod
from typing import Any


class BaseLLMClient(ABC):
    """
    Base abstraction for any asynchronous Large Language Model client.

    SRP:
        Defines only the contract for async text generation.

    DIP:
        Higher-level modules (RAG, use-cases) depend on this abstraction,
        not on concrete provider implementations.

    OCP:
        New LLM providers can be added without modifying dependent code.
    """

    @abstractmethod
    async def generate(self, prompt: str, **kwargs: Any) -> str:
        """
        Generate text asynchronously from a given prompt.

        Args:
            prompt (str): The input prompt.
            **kwargs: Provider-specific parameters
                      (temperature, max_tokens, etc.)

        Returns:
            str: Generated text output.
        """
        ...