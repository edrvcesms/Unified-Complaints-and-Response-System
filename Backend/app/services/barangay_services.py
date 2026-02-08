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


async def create_barangay_account(barangay_data: BarangayAccountCreate, db: AsyncSession) -> BarangayWithUserData:
    
    result = await db.execute(
        select(User).where(User.email == barangay_data.barangay_email)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barangay account already exists")

    hashed_password = hash_password(barangay_data.password)

    new_account = User(
        email=barangay_data.barangay_email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        is_administrator=True
    )
    barangay = Barangay(
        barangay_name=barangay_data.barangay_name,
        barangay_address=barangay_data.barangay_address,
        barangay_contact_number=barangay_data.barangay_contact_number,
        barangay_email=barangay_data.barangay_email,
        created_at=datetime.utcnow()
    )

    barangay_account = BarangayAccount(
        user=new_account,
        barangay=barangay,
        created_at=datetime.utcnow()
    )

    db.add_all([new_account, barangay_account, barangay])
    await db.commit()
    await db.refresh(barangay_account)

    return BarangayWithUserData.model_validate(barangay_account.barangay, from_attributes=True)