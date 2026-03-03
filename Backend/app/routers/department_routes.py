from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from app.services.department_services import get_all_departments, get_department_forwarded_incidents, forwarded_dept_incident_by_barangay, weekly_forwarded_incidents_stats
from app.schemas.department_schema import DepartmentWithUserData
from app.schemas.incident_schema import IncidentData
from app.models.user import User  
from typing import List
from app.utils.logger import logger

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_departments(db: AsyncSession = Depends(get_async_db), current_user: DepartmentWithUserData = Depends(get_current_user)):
    return await get_all_departments(db)

@router.get("/forwarded-incidents", status_code=status.HTTP_200_OK)
async def get_forwarded_incidents_for_department(
    current_user: DepartmentWithUserData = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
) -> List[IncidentData]:
    return await get_department_forwarded_incidents(current_user.department_account.id, db)
  
@router.get("/forwarded-incidents/{barangay_id}", status_code=status.HTTP_200_OK)
async def get_forwarded_incidents_for_barangay(
    barangay_id: int,
    current_user: DepartmentWithUserData = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
) -> List[IncidentData]:
    return await forwarded_dept_incident_by_barangay(current_user.department_account.id, barangay_id, db)
  
@router.get("/weekly-stats", status_code=status.HTTP_200_OK)
async def get_weekly_forwarded_incidents_stats(
    current_user: DepartmentWithUserData = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    return await weekly_forwarded_incidents_stats(current_user.department_account.id, db)