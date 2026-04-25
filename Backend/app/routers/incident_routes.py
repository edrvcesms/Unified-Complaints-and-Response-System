from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, UploadFile, File
from datetime import datetime
from app.dependencies.rate_limiter import limiter
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.incidents_services import get_incidents_by_barangay, get_incident_by_id, mark_incident_as_viewed, get_all_incidents
from app.dependencies.auth_dependency import get_current_user
from app.services.complaint_services import get_complaints_by_incident, notify_user_for_hearing
from app.services.incidents_services import forward_incident_to_lgu
from app.services.complaint_actions_services import resolve_complaints_by_incident, review_complaints_by_incident, reject_complaints_by_incident
from app.services.lgu_services import assign_incident_to_department
from app.services.department_services import get_incidents_forwarded_to_department
from app.dependencies.db_dependency import get_async_db
from app.constants.roles import UserRole
from app.schemas.response_schema import ResponseCreateSchema
from app.models.user import User
from app.utils.logger import logger

router = APIRouter()


def parse_response_data(response_data: Optional[str], actions_taken: Optional[str]) -> ResponseCreateSchema:
    response_text = response_data.strip() if response_data else ""
    if response_text:
        try:
            return ResponseCreateSchema.model_validate_json(response_text)
        except Exception:
            try:
                return ResponseCreateSchema.model_validate(json.loads(response_text))
            except Exception:
                return ResponseCreateSchema(actions_taken=response_text)

    actions_text = actions_taken.strip() if actions_taken else ""
    if actions_text:
        return ResponseCreateSchema(actions_taken=actions_text)

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Missing response data.",
    )
    

@router.get("/", status_code=status.HTTP_200_OK)
async def get_incidents(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_incidents_by_barangay(current_user.barangay_account.barangay_id, db)

@router.get("/all", status_code=status.HTTP_200_OK)
@router.get("/all/", status_code=status.HTTP_200_OK)
@router.get("/archive", status_code=status.HTTP_200_OK)
@router.get("/archive/", status_code=status.HTTP_200_OK)
async def get_all_incidents_endpoint(db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

    return await get_all_incidents(current_user, db)

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
async def resolve_incident_complaints(
    incident_id: int,
    response_data: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    response_payload = parse_response_data(response_data, actions_taken)
    return await resolve_complaints_by_incident(response_payload, incident_id, current_user.id, attachments=attachments, db=db)

@router.patch("/{incident_id}/review", status_code=status.HTTP_200_OK)
async def review_incident_complaints(
    incident_id: int,
    response_data: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    response_payload = parse_response_data(response_data, actions_taken)
    return await review_complaints_by_incident(response_payload, incident_id, current_user.id, attachments=attachments, db=db)

@router.patch("/{incident_id}/reject", status_code=status.HTTP_200_OK)
async def reject_incident_complaints(
    incident_id: int,
    response_data: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role not in [UserRole.LGU_OFFICIAL, UserRole.DEPARTMENT_STAFF, UserRole.BARANGAY_OFFICIAL]:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    response_payload = parse_response_data(response_data, actions_taken)
    return await reject_complaints_by_incident(incident_id, current_user.id, response_payload, attachments=attachments, db=db)

@router.patch("/{incident_id}/forward/lgu", status_code=status.HTTP_200_OK)
async def forward_incident_lgu(
    incident_id: int,
    response_data: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role != UserRole.BARANGAY_OFFICIAL:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    response_payload = parse_response_data(response_data, actions_taken)
    return await forward_incident_to_lgu(response_payload, incident_id, current_user.id, attachments=attachments, db=db)

@router.patch("/assign/{incident_id}/department/{department_account_id}", status_code=status.HTTP_200_OK)
async def assign_incident_department(
    incident_id: int,
    department_account_id: int,
    response_data: Optional[str] = Form(None),
    actions_taken: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    
    if current_user.role != UserRole.LGU_OFFICIAL:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    response_payload = parse_response_data(response_data, actions_taken)
    return await assign_incident_to_department(response_payload, incident_id, current_user.id, department_account_id, attachments=attachments, db=db)

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