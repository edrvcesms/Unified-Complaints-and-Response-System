from app.services.emergency_hotline_services import add_emergency_hotlines
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from app.models.user import User
from app.dependencies.rate_limiter import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.emergency_hotline import CreateEmergencyHotlineModel

router = APIRouter()

@router.post("/add-hotline", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_emergency_hotline(request: Request, hotline_data: CreateEmergencyHotlineModel, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action.")
    
    return await add_emergency_hotlines(hotline_data, db)