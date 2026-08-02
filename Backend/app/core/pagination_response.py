"""Generic response models for paginated API collections."""

from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Metadata describing the page returned by a collection endpoint."""

    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool

    @classmethod
    def from_total(cls, *, page: int, page_size: int, total_items: int) -> "PaginationMeta":
        total_pages = ceil(total_items / page_size) if total_items else 0
        return cls(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """Stable response envelope returned by all paginated list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    data: list[T] = Field(default_factory=list)
    pagination: PaginationMeta
