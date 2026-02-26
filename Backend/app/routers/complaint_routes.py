from fastapi import APIRouter, Depends, status, Form, UploadFile, File
from typing import List
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.complaint_schema import ComplaintCreateData
from app.dependencies.rate_limiter import limiter
from app.services.complaint_services import submit_complaint, get_my_complaints, get_all_complaints, get_complaint_by_id, get_weekly_complaint_stats
from app.dependencies.auth_dependency import get_current_user
from app.services.attachment_services import upload_attachments
from app.services.complaint_cluster_service import cluster_complaints
from app.models.user import User
from fastapi.requests import Request

router = APIRouter()

@router.get("/all", status_code=status.HTTP_200_OK)
@limiter.limit("50/minute")
async def list_all_complaints(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_complaints(db)

@router.get("/stats/weekly", status_code=status.HTTP_200_OK)
@limiter.limit("50/minute")
async def weekly_complaint_stats(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_weekly_complaint_stats(db)

@router.get("/my-complaints", status_code=status.HTTP_200_OK)
@limiter.limit("50/minute")
async def list_my_complaints(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_my_complaints(current_user.id, db)


@router.get("/{complaint_id}", status_code=status.HTTP_200_OK)
@limiter.limit("50/minute")
async def get_complaint(request: Request, complaint_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_complaint_by_id(complaint_id, db)
    
@router.post("/submit-complaint", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_complaint(request: Request, data: str = Form(...), attachments: List[UploadFile] = File(default=None), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    complaint_data = ComplaintCreateData.parse_raw(data)
    complaint = await submit_complaint(complaint_data, current_user.id, db)
    if attachments:
        await upload_attachments(attachments, current_user.id, complaint.id, db)
#await cluster_complaints(complaint_data, current_user.id, complaint.id, db)
    return {"message": "Complaint submitted successfully", "complaint_id": complaint.id}
