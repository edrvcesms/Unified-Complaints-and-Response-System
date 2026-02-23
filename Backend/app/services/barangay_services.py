from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_schema import BarangayAccountCreate, BarangayWithUserData
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.utils.caching import set_cache, get_cache, delete_cache
from app.utils.logger import logger
from typing import List

async def get_barangay_account(user_id: int, db: AsyncSession) -> BarangayWithUserData:
    try:
        cached_barangay = await get_cache(f"barangay_profile:{user_id}")
        if cached_barangay:
            logger.info(f"Barangay profile for user ID {user_id} retrieved from cache")
            return BarangayWithUserData.model_validate_json(cached_barangay)
        
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
            .where(Barangay.barangay_account.has(BarangayAccount.user_id == user_id))
        )
        barangay = result.scalars().first()
        if not barangay:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
        
        barangay_with_user_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
        await set_cache(f"barangay_profile:{user_id}", barangay_with_user_data.model_dump_json(), expiration=3600)
        logger.info(f"Barangay profile for user ID {user_id} retrieved from database and cached")
        return barangay_with_user_data
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_barangay_data: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_barangay_by_id(barangay_id: int, db: AsyncSession) -> BarangayWithUserData:
    try:
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
            .where(Barangay.id == barangay_id)
        )
        logger.info(f"Executed query to get barangay with ID: {barangay_id}")
        barangay = result.scalars().first()
        logger.info(f"Fetched barangay: {barangay}")
        if not barangay:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
        
        barangay_with_user_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
        await set_cache(f"barangay_profile:{barangay.id}", barangay_with_user_data.model_dump_json(), expiration=3600)
        return barangay_with_user_data
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_barangay_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def get_all_barangays(db: AsyncSession) -> List[BarangayWithUserData]:
    try:
        cached_barangays = await get_cache("all_barangays")
        if cached_barangays:
            logger.info("All barangays retrieved from cache")
            return [BarangayWithUserData.model_validate_json(barangay) for barangay in cached_barangays]
        
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
        )
        barangays = result.scalars().all()
        logger.info(f"Fetched all barangays: {barangays}")
        all_barangays = [BarangayWithUserData.model_validate(barangay, from_attributes=True) for barangay in barangays]
        await set_cache("all_barangays", [barangay.model_dump_json() for barangay in all_barangays], expiration=3600)
        return all_barangays
   
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_barangays: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    