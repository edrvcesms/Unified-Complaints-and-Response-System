from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.caching import delete_cache, set_cache, get_cache
from app.utils.logger import logger
from app.models.complaint import Complaint
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from app.constants.complaint_status import ComplaintStatus

async def get_forwarded_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        forwarded_incidents_cache = await get_cache(f"forwarded_barangay_incidents:{barangay_id}")
        if forwarded_incidents_cache is not None:
            logger.info(f"Cache hit for forwarded incidents of barangay ID: {barangay_id}")
            return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in forwarded_incidents_cache]
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
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user)
            )
            .distinct()
        )
        logger.info(f"Executed query to get forwarded incidents for barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        
        
        logger.info(f"Found {len(incidents)} forwarded incidents for barangay ID: {barangay_id}")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"forwarded_barangay_incidents:{barangay_id}", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
      
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_forwarded_incidents_by_barangay: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
      
async def get_all_forwarded_incidents(db: AsyncSession):
    try:
        forwarded_incidents = await get_cache("all_forwarded_incidents")
        if forwarded_incidents is not None:
            logger.info("Cache hit for all forwarded incidents")
            return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in forwarded_incidents]
        
        result = await db.execute(
            select(IncidentModel)
            .join(IncidentModel.complaint_clusters)
            .join(IncidentComplaintModel.complaint)
            .where(Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user)
            )
            .distinct()
        )
        logger.info("Executed query to get all forwarded incidents")
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} total forwarded incidents")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache("all_forwarded_incidents", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in get_all_forwarded_incidents: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def weekly_forwarded_incidents_stats(db: AsyncSession):
    try:
        from datetime import datetime, timedelta
        
        today = datetime.now().date()
        week_ago = today - timedelta(days=6)
        
        result = await db.execute(
            select(
                func.date(Complaint.created_at).label('date'),
                Complaint.status,
                func.count(Complaint.id).label('count')
            )
            .where(
                func.date(Complaint.created_at) >= week_ago,
                Complaint.status.in_([
                    ComplaintStatus.FORWARDED_TO_LGU.value,
                    ComplaintStatus.RESOLVED.value
                ])
            )
            .group_by(func.date(Complaint.created_at), Complaint.status)
        )
        
        stats = result.all()
        
        daily_counts = {}
        for stat in stats:
            date_str = stat.date.isoformat()
            if date_str not in daily_counts:
                daily_counts[date_str] = {"forwarded": 0, "resolved": 0}
            
            if stat.status == ComplaintStatus.FORWARDED_TO_LGU.value:
                daily_counts[date_str]["forwarded"] = stat.count
            elif stat.status == ComplaintStatus.RESOLVED.value:
                daily_counts[date_str]["resolved"] = stat.count
        
        return {"daily_counts": daily_counts}
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in weekly_forwarded_incidents_stats: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))