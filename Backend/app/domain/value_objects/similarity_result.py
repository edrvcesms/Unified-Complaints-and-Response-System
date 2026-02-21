from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SimilarityResult:
    """
    Represents the result of a vector similarity search from Pinecone.
    Immutable value object — no identity, only data.
    """
    complaint_id: int
    incident_id: Optional[int]
    score: float           # cosine similarity: 0.0 (different) → 1.0 (identical)
    barangay_id: int
    category_id: int
    status: str
    created_at_unix: float

    @property
    def is_similar(self) -> bool:
        """
        Returns True if the score meets the similarity threshold.
        Threshold: cosine similarity >= 0.65 (distance <= 0.35).
        """
        return self.score >= 0.65
