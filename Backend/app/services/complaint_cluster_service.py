from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.models.complaint import Complaint
from sqlalchemy import select
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse
from app.utils.caching import set_cache, get_cache, delete_cache
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repository.incident_repository import IncidentRepository
#from app.tasks import cluster_complaint_task

async def cluster_complaints(complaint_data: ComplaintCreateData, user_id: int, complaint_id: int, db: AsyncSession):
    
    incident_repo = IncidentRepository(db)
    category_config = await incident_repo.get_category_config(complaint_data.category_id)
    task_payload = {
        "complaint_id": complaint_id,
        "user_id": user_id,
        "title": complaint_data.title,
        "description": complaint_data.description,
        "barangay_id": complaint_data.barangay_id,
        "category_id": complaint_data.category_id,
        "category_time_window_hours": category_config["time_window_hours"],
        "category_base_severity_weight": category_config["base_severity_weight"],
        "similarity_threshold": category_config["similarity_threshold"],
        "created_at": datetime.utcnow().isoformat(),
    }
    
    
    
    