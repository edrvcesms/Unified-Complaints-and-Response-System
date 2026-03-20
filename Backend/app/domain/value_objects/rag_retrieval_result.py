# app/domain/value_objects/rag_retrieval_result.py
from dataclasses import dataclass


@dataclass(frozen=True)
class RAGRetrievalResult:
    chunk_id: str
    text: str        # Raw chunk text passed to the LLM as context
    source: str      # Origin document (filename, URL, title)
    score: float     # Cosine similarity score [0.0, 1.0]
    metadata: dict   # Arbitrary passthrough (category, barangay, date, etc.)