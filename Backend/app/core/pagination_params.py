"""Validated query parameters shared by collection endpoints."""

from datetime import date
from typing import Literal

from fastapi import Query
from pydantic import BaseModel


class PaginationParams(BaseModel):
    """The bounded page window used by database collection queries."""

    page: int = Query(default=1, ge=1)
    page_size: int = Query(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class ListParams(PaginationParams):
    """Extensible collection parameters.

    Services may opt into ``search``, ``sort``, ``order``, ``status`` and date
    bounds while every endpoint receives the same safe pagination defaults.
    """

    search: str | None = Query(default=None, min_length=1, max_length=200)
    sort: str | None = Query(default=None, min_length=1, max_length=100)
    order: Literal["asc", "desc"] = Query(default="desc")
    status: str | None = Query(default=None, max_length=100)
    date_from: date | None = Query(default=None)
    date_to: date | None = Query(default=None)

class IncidentListParams(ListParams):
    """Query params for the incidents list endpoint.

    Kept separate from the generic ``status`` field (reserved for the
    incident record's own lifecycle status, e.g. ACTIVE/ARCHIVED) to avoid
    ambiguity with severity level or complaint status.
    """

    severity_level: Literal["LOW", "MODERATE", "HIGH", "VERY_HIGH"] | None = Query(default=None)
    severity_score_min: float | None = Query(default=None, ge=0)
    severity_score_max: float | None = Query(default=None, ge=0)
    complaint_status: str | None = Query(default=None, max_length=100)
    sort: Literal["priority", "first_reported_at", "last_reported_at"] | None = Query(default=None)