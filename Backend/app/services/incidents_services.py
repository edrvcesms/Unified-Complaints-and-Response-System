from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.constants.complaint_status import ComplaintStatus
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.utils.caching import delete_cache
from app.utils.logger import logger
from app.models.complaint import Complaint
from app.utils.logger import logger
from app.utils.caching import delete_cache, set_cache, get_cache
from sqlalchemy.orm import selectinload

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
                    ComplaintStatus.UNDER_REVIEW.value
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
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user)
            )
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
        incident_data = IncidentData.model_validate(incident, from_attributes=True)
        await set_cache(f"incident:{incident_id}", incident_data.model_dump_json(),  expiration=3600)
        
        return incident_data  
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"Error in get_incident_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def forward_incident_to_lgu(incident_id: int, db: AsyncSession):
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
        
        await db.execute(
            update(Complaint)   
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.FORWARDED_TO_LGU.value)
        )
        await db.commit()
        
        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"barangay_incidents:{barangay_id}")
        await delete_cache(f"barangay_{barangay_id}_complaints")
        await delete_cache(f"forwarded_barangay_incidents:{barangay_id}")
        await delete_cache("all_forwarded_incidents")  # Clear LGU's all forwarded incidents cache
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been forwarded to LGU"}
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def assign_incident_to_department(incident_id: int, department_account_id: int, db: AsyncSession):
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
        
        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.FORWARDED_TO_DEPARTMENT.value, department_account_id=department_account_id)
        )
        await db.execute(
            update(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .values(department_account_id=department_account_id)
        )
        await db.commit()
        
        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"barangay_incidents:{barangay_id}")
        await delete_cache(f"barangay_{barangay_id}_complaints")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")
                
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been forwarded to the department"}
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
  