from app.models.category import Category
from sqlalchemy import select
from app.schemas.category_schema import CategoryModel, RejectionCategoryModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rejection_categories import RejectionCategory
from app.utils.logger import logger
from app.utils.caching import set_cache, get_cache
from fastapi import HTTPException, status
from app.utils.caching import DEFAULT_LIST_CACHE_TTL_SECONDS, EMPTY_LIST_CACHE_TTL_SECONDS, build_list_cache_key


async def get_all_rejection_categories(db: AsyncSession):
    try:
        cache_key = build_list_cache_key("rejection_categories", {})
        cached_categories = await get_cache(cache_key)
        if cached_categories is not None:
            logger.info("Cache hit for all rejection categories")
            return [RejectionCategoryModel.model_validate(item) for item in cached_categories]

        statement = select(RejectionCategory)
        result = await db.execute(statement)
        categories = result.scalars().all()

        response = [RejectionCategoryModel.model_validate(item, from_attributes=True) for item in categories]
        await set_cache(
            cache_key,
            [item.model_dump(mode="json") for item in response],
            expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response else EMPTY_LIST_CACHE_TTL_SECONDS,
        )
        return response

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_rejection_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def get_all_categories(db: AsyncSession):
    try:
        cache_key = build_list_cache_key("categories", {})
        cached_categories = await get_cache(cache_key)
        if cached_categories is not None:
            logger.info("Cache hit for all categories")
            return [CategoryModel.model_validate(item) for item in cached_categories]

        statement = select(Category)
        result = await db.execute(statement)
        categories = result.scalars().all()

        response = [CategoryModel.model_validate(item, from_attributes=True) for item in categories]
        await set_cache(
            cache_key,
            [item.model_dump(mode="json") for item in response],
            expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response else EMPTY_LIST_CACHE_TTL_SECONDS,
        )
        return response

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
