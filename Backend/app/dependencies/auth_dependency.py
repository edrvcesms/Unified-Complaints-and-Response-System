from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.models.user import User
from app.dependencies.db_dependency import get_db
from app.core.security import verify_token

bearer = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db)
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

    return user
