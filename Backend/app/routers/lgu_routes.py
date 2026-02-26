from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.lgu_services import get_forwarded_incidents_by_barangay, get_all_forwarded_incidents, weekly_forwarded_incidents_stats
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from app.models.user import User
from app.constants.roles import UserRole
from app.utils.logger import logger


router = APIRouter()


@router.get("/forwarded-incidents", status_code=status.HTTP_200_OK)
async def get_all_forwarded_incidents_route(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await get_all_forwarded_incidents(db)

@router.get("/forwarded-incidents/{barangay_id}", status_code=status.HTTP_200_OK)
async def get_forwarded_incidents_route(barangay_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await get_forwarded_incidents_by_barangay(barangay_id, db)

@router.get("/stats/weekly-forwarded-incidents", status_code=status.HTTP_200_OK)
async def weekly_forwarded_incidents_stats_route(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await weekly_forwarded_incidents_stats(db)