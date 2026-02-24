from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import JWTError
from app.models.barangay import Barangay
from app.models.user import User
from app.dependencies.db_dependency import get_async_db
from app.core.security import verify_token
from app.constants.roles import UserRole
from app.models.barangay_account import BarangayAccount
from app.utils.logger import logger

bearer = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_async_db)
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing")

    try:
        payload = verify_token(token.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.BARANGAY_OFFICIAL:
        result = await db.execute(select(User).options(selectinload(User.barangay_account).selectinload(BarangayAccount.barangay)).where(User.id == user_id))
        user = result.scalars().first()
        logger.info(f"Fetched user with barangay data: {user}, Barangay: {user.barangay_account.barangay_id if user.barangay_account else 'N/A'}")
        return user

    return user
