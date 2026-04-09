from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from datetime import datetime
from app.dependencies.rate_limiter import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.incidents_services import assign_incident_to_department, get_incidents_by_barangay, get_incident_by_id, mark_incident_as_viewed
from app.dependencies.auth_dependency import get_current_user
from app.services.complaint_services import get_complaints_by_incident, resolve_complaints_by_incident, review_complaints_by_incident, notify_user_for_hearing, reject_complaints_by_incident
from app.services.incidents_services import forward_incident_to_lgu, assign_incident_to_department, get_incidents_forwarded_to_department
from app.dependencies.db_dependency import get_async_db
from app.constants.roles import UserRole
from app.schemas.response_schema import ResponseCreateSchema
from app.models.user import User
from app.utils.logger import logger

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_incidents(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_incidents_by_barangay(current_user.barangay_account.barangay_id, db)

@router.get("/department", status_code=status.HTTP_200_OK)
async def get_department_incidents(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role != UserRole.DEPARTMENT_STAFF:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_incidents_forwarded_to_department(current_user.department_account.id, db)
  
@router.get("/{incident_id}", status_code=status.HTTP_200_OK)
async def get_incident(incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_incident_by_id(incident_id, db)
    
@router.get("/{incident_id}/complaints", status_code=status.HTTP_200_OK)
async def get_incident_complaints(incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_complaints_by_incident(incident_id, db)

@router.patch("/{incident_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_incident_complaints(response_data: ResponseCreateSchema, incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await resolve_complaints_by_incident(response_data, incident_id, current_user.id, db)

@router.patch("/{incident_id}/review", status_code=status.HTTP_200_OK)
async def review_incident_complaints(response_data: ResponseCreateSchema, incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await review_complaints_by_incident(response_data, incident_id, current_user.id, db)

@router.patch("/{incident_id}/reject", status_code=status.HTTP_200_OK)
async def reject_incident_complaints(response_data: ResponseCreateSchema, incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.BARANGAY_OFFICIAL]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await reject_complaints_by_incident(incident_id, current_user.id, response_data, db)

@router.patch("/{incident_id}/forward/lgu", status_code=status.HTTP_200_OK)
async def forward_incident_lgu(response_data: ResponseCreateSchema, incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role != UserRole.BARANGAY_OFFICIAL:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await forward_incident_to_lgu(response_data,incident_id, current_user.id, db)

@router.patch("/assign/{incident_id}/department/{department_account_id}", status_code=status.HTTP_200_OK)
async def assign_incident_department(response_data: ResponseCreateSchema, incident_id: int, department_account_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role != UserRole.LGU_OFFICIAL:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await assign_incident_to_department(response_data,incident_id, current_user.id, department_account_id, db)

@router.post("/{incident_id}/mark-viewed", status_code=status.HTTP_200_OK)
async def mark_incident_viewed(incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await mark_incident_as_viewed(incident_id, db)

@router.post("/notify-hearing/{incident_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def notify_hearing(request: Request, incident_id: int, hearing_date: datetime = Form(...), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    await notify_user_for_hearing(incident_id, hearing_date, db)
