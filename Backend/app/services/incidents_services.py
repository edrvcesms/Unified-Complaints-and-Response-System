from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.models.department_account import DepartmentAccount
from app.schemas.response_schema import ResponseCreateSchema
from app.constants.complaint_status import ComplaintStatus
from app.models.incident_model import IncidentModel
from app.models.response import Response
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.caching import delete_cache
from app.utils.logger import logger
from app.models.complaint import Complaint
from app.tasks import send_notifications_task, save_response_task
from app.utils.caching import delete_cache, set_cache, get_cache
from app.models.user import User
from sqlalchemy.orm import selectinload
from app.utils.cache_invalidator import invalidate_cache

async def get_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        incidents_cache = await get_cache(f"barangay_incidents:{barangay_id}")
        if incidents_cache is not None:
            logger.info(f"Cache hit for barangay ID: {barangay_id}")
            return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in incidents_cache]
        
        subq = (
            select(IncidentComplaintModel.incident_id)
            .join(IncidentComplaintModel.complaint)
            .where(
                IncidentComplaintModel.incident_id == IncidentModel.id,
                Complaint.status.in_([
                    ComplaintStatus.SUBMITTED.value,
                    ComplaintStatus.REVIEWED_BY_BARANGAY.value
                ])
            )
            .exists()
        )

        result = await db.execute(
            select(IncidentModel)
            .where(
                IncidentModel.barangay_id == barangay_id,
                subq
            )
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
            .order_by(IncidentModel.first_reported_at.asc())
        )

        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} incidents for barangay ID: {barangay_id}")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"barangay_incidents:{barangay_id}", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
      
    except HTTPException:
        raise
    except Exception as e:  
        logger.error(f"Error in get_incidents_by_barangay: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )
    
async def get_incident_by_id(incident_id: int, db: AsyncSession):
    try:
        incident_cache = await get_cache(f"incident:{incident_id}")
        if incident_cache is not None:
            logger.info(f"Cache hit for incident ID: {incident_id}")
            return IncidentData.model_validate_json(incident_cache) if isinstance(incident_cache, str) else IncidentData.model_validate(incident_cache, from_attributes=True)
        
        result = await db.execute(
            select(IncidentModel)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
            .where(IncidentModel.id == incident_id)
        )
        
        logger.info(f"Executed query to get incident for ID: {incident_id}")
        
        incident = result.scalars().first()
        
        if not incident:
            logger.warning(f"Incident with ID {incident_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
        logger.info(f"Fetched incident with ID {incident_id}")
        incident_data = IncidentData.model_validate(incident, from_attributes=True)
        await set_cache(f"incident:{incident_id}", incident_data.model_dump_json(),  expiration=3600)
        
        return incident_data  
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error in get_incident_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def forward_incident_to_lgu(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, db: AsyncSession):
    try:
        incident_result = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
        incident = incident_result.scalars().first()
        
        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
        
        barangay_id = incident.barangay_id
        
        result = await db.execute(select(IncidentComplaintModel.complaint_id).where(IncidentComplaintModel.incident_id == incident_id))
        
        complaint_ids = result.scalars().all()
        
        if not complaint_ids:
            return {"message": "No complaints found for this incident"}
        
        # Set the forwarded_at timestamp when forwarding to LGU
        await db.execute(
            update(Complaint)   
            .where(Complaint.id.in_(complaint_ids))
            .values(
                status=ComplaintStatus.FORWARDED_TO_LGU.value,
                forwarded_at=datetime.utcnow(),
                is_rejected_by_lgu=False
            )
        )
        await db.commit()
        
        
        for complaint_id in complaint_ids:
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title="Complaint Forwarded to LGU",
                    message="Your complaint has been forwarded to the LGU for further processing.",
                    complaint_id=complaint.id,
                    notification_type="update"
                )
                
        save_response_task.delay(
            incident_id=incident_id,
            responder_id=responder_id,
            actions_taken=response_data.actions_taken
        )
        
        
        result = await db.execute(
            select(User).where(User.role == "lgu_official")
        )
        lgu_officials = result.scalars().all()
        for official in lgu_officials:
            send_notifications_task.delay(
                user_id=official.id,
                title="New Incident Forwarded to LGU",
                message=f"A new incident with ID {incident.id} has been forwarded to the LGU.",
                complaint_id=None,
                notification_type="update"
            )
            
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in await db.execute(select(Complaint.user_id).where(Complaint.id.in_(complaint_ids)))],
            barangay_id=barangay_id,
            incident_ids=[incident_id],
            include_global=True
        )
            
            
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been forwarded to LGU"}
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    


async def mark_incident_as_viewed(incident_id: int, db: AsyncSession):
    """Mark an incident as viewed, resetting new complaint indicators"""
    try:
        result = await db.execute(
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
        )
        incident = result.scalars().first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found"
            )
        
        incident.has_new_complaints = False
        incident.new_complaint_count = 0
        incident.last_viewed_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(incident)
        
        await invalidate_cache(
            incident_ids=[incident_id],
            barangay_id=incident.barangay_id,
            department_account_id=incident.department_account_id,
            include_global=True
        )
        
        return IncidentData.model_validate(incident, from_attributes=True)

    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in mark_incident_as_viewed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))