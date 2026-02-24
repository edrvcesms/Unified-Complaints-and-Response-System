from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.logger import logger
from app.models.complaint import Complaint
from app.constants.roles import UserRole
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
                    .selectinload(Complaint.user)
            )
            .where(IncidentModel.barangay_id == barangay_id)
        )
        
        logger.info(f"Executed query to get incidents for barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        
        logger.info(f"Fetched {len(incidents)} incidents for barangay ID: {barangay_id}")
        for incident in incidents:
            logger.info(f"Incident ID: {incident.id}, Title: {incident.title}, Category: {incident.category.category_name if incident.category else 'N/A'}, Barangay: {incident.barangay.barangay_name if incident.barangay else 'N/A'}")
            logger.info(f"complaint_names: {[complaint_cluster.complaint.title for complaint_cluster in incident.complaint_clusters]}")
        
        return [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
      
    except HTTPException:
        raise
    except Exception as e:  
        logger.error(f"Error in get_incidents_by_barangay: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
  