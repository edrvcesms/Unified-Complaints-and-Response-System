from datetime import datetime, timezone
from fastapi import status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, func, or_, select, String
from app.models.incident_model import IncidentModel
from app.core.pagination_params import ListParams
from app.core.pagination import paginate
from app.core.pagination_response import PaginatedResponse
from app.utils.caching import set_cache, get_cache, build_list_cache_key, DEFAULT_LIST_CACHE_TTL_SECONDS, EMPTY_LIST_CACHE_TTL_SECONDS
from app.schemas.incident_schema import IncidentOut
from app.utils.logger import logger
from app.utils.query_optimization import QueryOptions
from app.models.category import Category
from app.models.barangay import Barangay

# this service will handle all the hearing related operations, here you will find the logic for fetching scheduled hearings, viewing hearing details.

async def get_scheduled_hearings(
    db: AsyncSession,
    params: ListParams,
    barangay_id: int,
) -> PaginatedResponse[IncidentOut]:
    try:
        cache_key = build_list_cache_key(
            "scheduled_hearings",
            params.model_dump(mode="json"),
            barangay_id=barangay_id,
        )
        scheduled_hearings_cache = await get_cache(cache_key)
        if scheduled_hearings_cache is not None:
            logger.info(f"Cache hit for scheduled hearings with barangay_id: {barangay_id}")
            return PaginatedResponse[IncidentOut].model_validate(scheduled_hearings_cache)

        statement = (
            select(IncidentModel)
            .where(
                IncidentModel.barangay_id == barangay_id,
                IncidentModel.hearing_date.isnot(None),
                IncidentModel.hearing_date >= datetime.now(timezone.utc),
            )
            .options(*QueryOptions.incident_minimal())
        )

        if params.search:
            search_term = f"%{params.search}%"
            statement = statement.where(or_(
                IncidentModel.title.ilike(search_term),
                cast(IncidentModel.id, String).ilike(search_term),
                select(Category.id).where(
                    Category.id == IncidentModel.category_id,
                    Category.category_name.ilike(search_term),
                ).exists(),
                select(Barangay.id).where(
                    Barangay.id == IncidentModel.barangay_id,
                    Barangay.barangay_name.ilike(search_term),
                ).exists(),
            ))

        if params.date_from:
            statement = statement.where(func.date(IncidentModel.hearing_date) >= params.date_from)
        if params.date_to:
            statement = statement.where(func.date(IncidentModel.hearing_date) <= params.date_to)

        hearing_order = IncidentModel.hearing_date.asc() if params.order == "asc" else IncidentModel.hearing_date.desc()
        statement = statement.order_by(hearing_order)

        page = await paginate(
            db,
            statement,
            params,
            mapper=lambda item: IncidentOut.model_validate(item, from_attributes=True),
        )
        response = PaginatedResponse[IncidentOut].model_validate(page)
        await set_cache(
            cache_key,
            response.model_dump(mode="json"),
            expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response.data else EMPTY_LIST_CACHE_TTL_SECONDS,
        )
        return response

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in get_scheduled_hearings")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")