from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_schema import BarangayAccountCreate, BarangayWithUserData
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from sqlalchemy import select
from app.core.security import hash_password, decrypt_password
from datetime import datetime
from sqlalchemy.orm import selectinload
from app.utils.logger import logger
from typing import List

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
        
        return BarangayWithUserData.model_validate(barangay, from_attributes=True)
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_barangay_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def get_all_barangays(db: AsyncSession) -> List[BarangayWithUserData]:
    try:
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
        )
        barangays = result.scalars().all()
        logger.info(f"Fetched all barangays: {barangays}")
        return [BarangayWithUserData.model_validate(barangay, from_attributes=True) for barangay in barangays]
   
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_barangays: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    