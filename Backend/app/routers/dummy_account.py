from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy import select
from app.dependencies.db_dependency import get_async_db
from app.models.user import User
from app.models.user_device import UserDevice
from app.core.security import hash_password
from pydantic import BaseModel
from app.utils.logger import logger

class DummyAccountModel(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    device_id: str
    model: str
    brand: str
    system_name: str
    app_version: str
    build_number: str

router = APIRouter()

@router.post("/create-dummy-accounts", status_code=status.HTTP_201_CREATED)
async def create_dummy_accounts(dummy_data: List[DummyAccountModel], db: AsyncSession = Depends(get_async_db)):

    try:
        if not dummy_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one dummy account is required.",
            )

        emails = [data.email for data in dummy_data]
        existing_result = await db.execute(
            select(User.email).where(User.email.in_(emails))
        )
        existing_emails = set(existing_result.scalars().all())
        duplicate_emails = {
            email for email in emails
            if emails.count(email) > 1
        }
        if existing_emails or duplicate_emails:
            conflicting_emails = sorted(existing_emails | duplicate_emails)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Account email already exists: {', '.join(conflicting_emails)}",
            )

        new_users = []
        for data in dummy_data:
            new_user = User(
                first_name=data.first_name,
                last_name=data.last_name,
                email=data.email,
                hashed_password=hash_password(data.password)
            )
            db.add(new_user)
            new_users.append((new_user, data))

        await db.flush()

        devices = []
        for new_user, data in new_users:
            new_device = UserDevice(
                user_id=new_user.id,
                device_id=data.device_id,
                model=data.model,
                brand=data.brand,
                system_name=data.system_name,
                app_version=data.app_version,
                build_number=data.build_number
            )
            devices.append(new_device)

        db.add_all(devices)
        await db.commit()

        return {
            "message": "Dummy accounts created successfully.",
            "created_count": len(new_users),
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Failed to create dummy accounts")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create dummy accounts.",
        ) from e
      
      