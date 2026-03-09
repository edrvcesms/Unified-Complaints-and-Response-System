from fastapi import status, APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user
from app.services.report_services import get_monthly_report
from app.models.user import User
from typing import Optional

router = APIRouter()

@router.get("/monthly/{barangay_id}", status_code=status.HTTP_200_OK)
async def barangay_monthly_report(
    request: Request, 
    barangay_id: int, 
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=2020, le=2100, description="Year"),
    db: AsyncSession = Depends(get_async_db), 
    current_user: User = Depends(get_current_user)
):
    report = await get_monthly_report(barangay_id, current_user.id, db, month, year)
    return report