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
from app.constants.roles import UserRole
from app.utils.logger import logger
from sqlalchemy.orm import selectinload

async def get_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
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
        
        return [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
      
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
    
async def forward_incident_to_lgu(incident_id: int, db: AsyncSession):
    try:
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
        for complaint_id in complaint_ids:
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
        for complaint_id in complaint_ids:
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
  