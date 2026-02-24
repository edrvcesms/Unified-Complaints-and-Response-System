from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.logger import logger
from app.models.complaint import Complaint
from app.constants.roles import UserRole
from app.utils.logger import logger
from sqlalchemy.orm import selectinload

async def get_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentModel)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user)
            )
            .where(IncidentModel.barangay_id == barangay_id)
        )
        
        logger.info(f"Executed query to get incidents for barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} incidents for barangay ID: {barangay_id}")
        
        return [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
      
    except HTTPException:
        raise
    except Exception as e:  
        logger.error(f"Error in get_incidents_by_barangay: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_incident_by_id(incident_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentModel)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment)
            )
            .where(IncidentModel.id == incident_id)
        )
        
        logger.info(f"Executed query to get incident for ID: {incident_id}")
        
        incident = result.scalars().first()
        
        if not incident:
            logger.warning(f"Incident with ID {incident_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
        logger.info(f"Fetched incident with ID {incident_id}")
        
        return IncidentData.model_validate(incident, from_attributes=True)  
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error in get_incident_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))