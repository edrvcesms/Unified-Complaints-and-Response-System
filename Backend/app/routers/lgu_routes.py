from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.lgu_services import get_forwarded_incidents_by_barangay, get_all_forwarded_incidents, weekly_forwarded_incidents_stats, complaint_counts_by_barangay_category, monthly_forwarded_incidents_stats, yearly_forwarded_incidents_stats
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from app.models.user import User
from app.core.pagination_params import ListParams

router = APIRouter()


@router.get("/forwarded-incidents", status_code=status.HTTP_200_OK)
async def get_all_forwarded_incidents_route(params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await get_all_forwarded_incidents(db, params)

@router.get("/forwarded-incidents/{barangay_id}", status_code=status.HTTP_200_OK)
async def get_forwarded_incidents_route(barangay_id: int, params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await get_forwarded_incidents_by_barangay(barangay_id, db, params)

@router.get("/stats/weekly-forwarded-incidents", status_code=status.HTTP_200_OK)
async def weekly_forwarded_incidents_stats_route(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    return await weekly_forwarded_incidents_stats(db)

@router.get("/stats/monthly-forwarded-incidents", status_code=status.HTTP_200_OK)
async def monthly_forwarded_incidents_stats_route(year: int, month: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await monthly_forwarded_incidents_stats(year, month, db)

@router.get("/stats/yearly-forwarded-incidents", status_code=status.HTTP_200_OK)
async def yearly_forwarded_incidents_stats_route(year: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await yearly_forwarded_incidents_stats(year, db)

@router.get("/stats/complaints-by-barangay-category", status_code=status.HTTP_200_OK)
async def complaints_by_barangay_category_stats_route(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await complaint_counts_by_barangay_category(db)
