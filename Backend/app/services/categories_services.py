from app.models.category import Category
from sqlalchemy import select
from app.schemas.category_schema import CategoryModel, RejectionCategoryModel
from app.models.rejection_categories import RejectionCategory
from app.utils.logger import logger
from app.utils.caching import set_cache, get_cache
from fastapi import HTTPException, status

async def get_all_rejection_categories(db):
    try:
        category_cache = await get_cache("all_rejection_categories")
        if category_cache:
            logger.info("Cache hit for all rejection categories")
            return [RejectionCategoryModel.model_validate_json(c) if isinstance(c, str) else RejectionCategoryModel.model_validate(c, from_attributes=True) for c in category_cache]
        
        result = await db.execute(select(RejectionCategory))
        categories = result.scalars().all()
        logger.info(f"Fetched all rejection categories: {len(categories)} categories found")
        category_list = [RejectionCategoryModel.model_validate(category, from_attributes=True) for category in categories]
        await set_cache("all_rejection_categories", [c.model_dump_json() for c in category_list], expiration=300)
        return category_list
      
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_rejection_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def get_all_categories(db):
    try:
        category_cache = await get_cache("all_categories")
        if category_cache:
            logger.info("Cache hit for all categories")
            return [CategoryModel.model_validate_json(c) if isinstance(c, str) else CategoryModel.model_validate(c, from_attributes=True) for c in category_cache]
        
        result = await db.execute(select(Category))
        categories = result.scalars().all()
        logger.info(f"Fetched all categories: {len(categories)} categories found")
        category_list = [CategoryModel.model_validate(category, from_attributes=True) for category in categories]
        await set_cache("all_categories", [c.model_dump_json() for c in category_list], expiration=300)
        return category_list
      
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_all_categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))