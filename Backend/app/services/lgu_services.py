from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.caching import delete_cache
from app.utils.logger import logger
from app.models.complaint import Complaint
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.constants.roles import UserRole
from app.constants.complaint_status import ComplaintStatus

async def get_forwarded_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentModel)
            .join(IncidentModel.complaint_clusters)
            .join(IncidentComplaintModel.complaint)
            .where(
                Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value,
                IncidentModel.barangay_id == barangay_id
            )
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
            )
            .distinct()
        )
        logger.info(f"Executed query to get forwarded incidents for barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        
        
        logger.info(f"Found {len(incidents)} forwarded incidents for barangay ID: {barangay_id}")
        
        return incidents
      
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_forwarded_incidents_by_barangay: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
      