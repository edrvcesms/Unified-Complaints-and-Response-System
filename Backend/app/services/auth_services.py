from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.logger import logger
from app.schemas.auth_schema import RegisterUser
from sqlalchemy import select
from app.core.security import hash_password, decrypt_password
from datetime import datetime
from app.utils.otp_handler import generate_otp
from app.utils.caching import set_cache, get_cache, delete_cache

async def register_user(user_data: RegisterUser, db: AsyncSession):

    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalars().first()

    if existing_user:
        logger.warning(f"Registration attempt with existing email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = hash_password(user_data.password)
    logger.info(f"Registering new user: {user_data.email}")

    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    logger.info(f"New user registered: {user_data.email}")

    return {"message": "User registered successfully"}