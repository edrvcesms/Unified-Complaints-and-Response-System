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
from typing import List

async def get_barangay_by_id(barangay_id: int, db: AsyncSession) -> BarangayWithUserData:
    result = await db.execute(
        select(Barangay)
        .options(
            selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
        )
        .where(Barangay.id == barangay_id)
    )
    barangay = result.scalars().first()
    if not barangay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
    
    return BarangayWithUserData.model_validate(barangay, from_attributes=True)


async def get_all_barangays(db: AsyncSession) -> List[BarangayWithUserData]:
    result = await db.execute(
    select(Barangay)
    .options(
        selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
    )
    .order_by(Barangay.created_at.desc())
)
    barangays = result.scalars().all()
    return [BarangayWithUserData.model_validate(barangay, from_attributes=True) for barangay in barangays]
