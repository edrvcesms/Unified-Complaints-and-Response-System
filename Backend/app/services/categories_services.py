from app.models.category import Category
from sqlalchemy import select
from app.schemas.category_schema import CategoryModel, RejectionCategoryModel
from app.models.rejection_categories import RejectionCategory
from app.utils.logger import logger
from app.utils.caching import set_cache, get_cache
from fastapi import HTTPException, status
from app.core.pagination import paginate
from app.core.pagination_params import ListParams
from app.core.pagination_response import PaginatedResponse
from app.utils.caching import DEFAULT_LIST_CACHE_TTL_SECONDS, EMPTY_LIST_CACHE_TTL_SECONDS, build_list_cache_key

async def get_all_rejection_categories(db, params: ListParams) -> PaginatedResponse[RejectionCategoryModel]:
    try:
        cache_key = build_list_cache_key("rejection_categories", params.model_dump(mode="json"))
        category_cache = await get_cache(cache_key)
        if category_cache is not None:
            logger.info("Cache hit for all rejection categories")
            return PaginatedResponse[RejectionCategoryModel].model_validate(category_cache)
        statement = select(RejectionCategory)
        page = await paginate(db, statement, params, mapper=lambda item: RejectionCategoryModel.model_validate(item, from_attributes=True))
        response = PaginatedResponse[RejectionCategoryModel].model_validate(page)
        await set_cache(cache_key, response.model_dump(mode="json"), expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response.data else EMPTY_LIST_CACHE_TTL_SECONDS)
        return response
      
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_rejection_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def get_all_categories(db, params: ListParams) -> PaginatedResponse[CategoryModel]:
    try:
        cache_key = build_list_cache_key("categories", params.model_dump(mode="json"))
        category_cache = await get_cache(cache_key)
        if category_cache is not None:
            logger.info("Cache hit for all categories")
            return PaginatedResponse[CategoryModel].model_validate(category_cache)
        statement = select(Category)
        page = await paginate(db, statement, params, mapper=lambda item: CategoryModel.model_validate(item, from_attributes=True))
        response = PaginatedResponse[CategoryModel].model_validate(page)
        await set_cache(cache_key, response.model_dump(mode="json"), expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response.data else EMPTY_LIST_CACHE_TTL_SECONDS)
        return response
      
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
