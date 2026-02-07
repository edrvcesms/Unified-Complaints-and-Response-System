from app.core.security import verify_token
from app.dependencies.db_dependency import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException
from fastapi.requests import Request
from app.models.user import User
from sqlalchemy import select

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:

    token = request.headers.get("Authorization")

    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing")
    
    try:
        payload = verify_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    
