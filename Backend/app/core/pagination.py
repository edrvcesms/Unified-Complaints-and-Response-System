"""SQLAlchemy 2.0 pagination helpers."""

from collections.abc import Callable
from typing import TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination_params import PaginationParams
from app.core.pagination_response import PaginatedResponse, PaginationMeta

ModelT = TypeVar("ModelT")
ResponseT = TypeVar("ResponseT")


async def paginate(
    db: AsyncSession,
    statement: Select[tuple[ModelT]],
    params: PaginationParams,
    *,
    mapper: Callable[[ModelT], ResponseT] | None = None,
) -> PaginatedResponse[ModelT | ResponseT]:
    """Execute one count and one bounded SQLAlchemy 2.0 collection query.

    The supplied statement retains its filters and eager-loading options.  The
    count is calculated from an order-free subquery; the data query receives
    only the requested ``OFFSET``/``LIMIT`` window, so complete tables are
    never materialized in application memory.
    """

    count_statement = select(func.count()).select_from(statement.order_by(None).subquery())
    total_items = int((await db.execute(count_statement)).scalar_one())
    result = await db.execute(statement.offset(params.offset).limit(params.page_size))
    records = list(result.unique().scalars().all())
    data = [mapper(record) for record in records] if mapper else records
    return PaginatedResponse(
        data=data,
        pagination=PaginationMeta.from_total(
            page=params.page,
            page_size=params.page_size,
            total_items=total_items,
        ),
    )
