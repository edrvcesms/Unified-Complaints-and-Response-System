from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
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
from app.tasks.notification_tasks import send_notifications_task
from app.models.response import Response
from app.services.attachment_services import enqueue_response_attachments
from app.utils.caching import set_cache, get_cache
from app.models.user import User
from app.services.complaint_services import log_status_change
from app.constants.roles import UserRole
from app.utils.query_optimization import QueryOptions, BatchLoader
from app.utils.cache_invalidator_optimized import CacheInvalidator


def _active_statuses_by_role(role: str) -> set[str]:
    if role == UserRole.BARANGAY_OFFICIAL:
        return {
            ComplaintStatus.SUBMITTED.value,
            ComplaintStatus.REVIEWED_BY_BARANGAY.value,
        }

    if role == UserRole.LGU_OFFICIAL:
        return {
            ComplaintStatus.FORWARDED_TO_LGU.value,
            ComplaintStatus.REVIEWED_BY_LGU.value,
        }

    if role == UserRole.DEPARTMENT_STAFF:
        return {
            ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
            ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
        }

    return set()


async def get_all_incidents_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        all_incidents_cache = await get_cache(f"all_incidents: barangay_id:{barangay_id}")
        if all_incidents_cache is not None:
            logger.info("Cache hit for all incidents")
            return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in all_incidents_cache]
        
        result = await db.execute(
            select(IncidentModel)
            .options(*QueryOptions.incident_full())
            .order_by(IncidentModel.first_reported_at.asc())
            .where(IncidentModel.barangay_id == barangay_id)
        )

        incidents = result.scalars().all()
        incidents_data =  [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"all_incidents: barangay_id:{barangay_id}", [i.model_dump_json() for i in incidents_data], expiration=3600)
        return incidents_data
    
    except HTTPException:
        raise
    
    except Exception:
        logger.exception("Error in get_all_incidents")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


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
            .options(*QueryOptions.incident_full())
            .order_by(IncidentModel.first_reported_at.asc())
        )

        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} incidents for barangay ID: {barangay_id}")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"barangay_incidents:{barangay_id}", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
      
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in get_incidents_by_barangay")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
    
async def get_incident_by_id(incident_id: int, db: AsyncSession):
    try:
        incident_cache = await get_cache(f"incident:{incident_id}")
        if incident_cache is not None:
            logger.info(f"Cache hit for incident ID: {incident_id}")
            return IncidentData.model_validate_json(incident_cache) if isinstance(incident_cache, str) else IncidentData.model_validate(incident_cache, from_attributes=True)
        
        result = await db.execute(
            select(IncidentModel)
            .options(*QueryOptions.incident_full())
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
        
    except Exception:
        logger.exception("Error in get_incident_by_id")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    
async def forward_incident_to_lgu(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, attachments: Optional[List[UploadFile]], db: AsyncSession):
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
                forwarded_at=datetime.now(timezone.utc),
                is_rejected_by_lgu=False
            )
        )
        
        await log_status_change(
            complaint_ids=complaint_ids,
            new_status=ComplaintStatus.FORWARDED_TO_LGU.value,
            changed_by_user_id=responder_id,
            db=db
        )
        
        incident.complaint_count = len(complaint_ids)
        incident.has_new_complaints = True
        incident.updated_at = datetime.now(timezone.utc)
        await db.commit()
        
        # OPTIMIZED: Batch fetch all complaints at once instead of in loop
        complaints_dict = await BatchLoader.fetch_complaints_by_ids(db, complaint_ids, minimal=True)
        
        # Send notifications using cached complaints
        for complaint_id in complaint_ids:
            complaint = complaints_dict.get(complaint_id)
            if complaint:
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title="Complaint Forwarded to LGU",
                    incident_id=incident_id,
                    message="Your complaint has been forwarded to the LGU for further processing.",
                    complaint_id=complaint.id,
                    notification_type="update",
                    event="info"
                )
                
        response = Response(
            incident_id=incident_id,
            responder_id=responder_id,
            actions_taken=response_data.actions_taken,
            response_date=datetime.now(timezone.utc),
        )
        db.add(response)
        await db.commit()
        await db.refresh(response)

        if attachments:
            await enqueue_response_attachments(attachments, response.id, responder_id)
        
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
                incident_id=incident_id,
                notification_type="update",
                event="info"

            )
            incident.lgu_account_id = official.id
            await db.commit()
            
        # OPTIMIZED: Use new CacheInvalidator with pipeline
        await CacheInvalidator.invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=await BatchLoader.fetch_user_ids_for_complaints(db, complaint_ids),
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
    
    except Exception:
        await db.rollback()
        logger.exception("Error in forward_incident_to_lgu")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    


async def mark_incident_as_viewed(incident_id: int, db: AsyncSession):
    """Mark an incident as viewed, resetting new complaint indicators"""
    try:
        result = await db.execute(
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(*QueryOptions.incident_full())
        )
        incident = result.scalars().first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found"
            )
        
        incident.has_new_complaints = False
        incident.new_complaint_count = 0
        incident.last_viewed_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(incident)
        
        await CacheInvalidator.invalidate_cache(
            incident_ids=[incident_id],
            barangay_id=incident.barangay_id,
            department_account_id=incident.department_account_id,
            include_global=True
        )
        
        return IncidentData.model_validate(incident, from_attributes=True)

    
    except HTTPException:
        raise
    
    except Exception:
        logger.exception("Error in mark_incident_as_viewed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


async def get_all_incidents(current_user: User, db: AsyncSession):
    try:
        role = current_user.role
        active_statuses = _active_statuses_by_role(role)
        archive_statuses = [status_value for status_value in ComplaintStatus if status_value.value not in active_statuses]

        if role == UserRole.BARANGAY_OFFICIAL:
            barangay_account = getattr(current_user, "barangay_account", None)
            if not barangay_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay account not found for current user")

            barangay_id = barangay_account.barangay_id
            cache_key = f"archive_incidents:barangay:{barangay_id}"

            cached = await get_cache(cache_key)
            if cached is not None:
                logger.info(f"Cache hit for archive incidents of barangay ID: {barangay_id}")
                return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in cached]

            archive_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(
                    IncidentComplaintModel.incident_id == IncidentModel.id,
                    Complaint.status.in_([s.value for s in archive_statuses]),
                )
                .exists()
            )

            result = await db.execute(
                select(IncidentModel)
                .where(
                    IncidentModel.barangay_id == barangay_id,
                    archive_filter,
                )
                .options(*QueryOptions.incident_full())
                .order_by(IncidentModel.first_reported_at.asc())
            )

            incidents = result.scalars().all()
            incidents_data = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
            await set_cache(cache_key, [i.model_dump_json() for i in incidents_data], expiration=360)
            return incidents_data

        if role == UserRole.LGU_OFFICIAL:
            cache_key = "archive_incidents:lgu"

            cached = await get_cache(cache_key)
            if cached is not None:
                logger.info("Cache hit for archive incidents of LGU")
                return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in cached]

            archive_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(
                    IncidentComplaintModel.incident_id == IncidentModel.id,
                    Complaint.status.in_([s.value for s in archive_statuses]),
                )
                .exists()
            )

            result = await db.execute(
                select(IncidentModel)
                .where(archive_filter)
                .options(*QueryOptions.incident_full())
                .order_by(IncidentModel.first_reported_at.asc())
            )

            incidents = result.scalars().all()
            incidents_data = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
            await set_cache(cache_key, [i.model_dump_json() for i in incidents_data], expiration=3600)
            return incidents_data

        if role == UserRole.DEPARTMENT_STAFF:
            department_account = getattr(current_user, "department_account", None)
            if not department_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department account not found for current user")

            department_account_id = department_account.id
            cache_key = f"archive_incidents:department:{department_account_id}"

            cached = await get_cache(cache_key)
            if cached is not None:
                logger.info(f"Cache hit for archive incidents of department account ID: {department_account_id}")
                return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in cached]

            archive_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(
                    IncidentComplaintModel.incident_id == IncidentModel.id,
                    Complaint.status.in_([s.value for s in archive_statuses]),
                )
                .exists()
            )

            result = await db.execute(
                select(IncidentModel)
                .where(
                    IncidentModel.department_account_id == department_account_id,
                    archive_filter,
                )
                .options(*QueryOptions.incident_full())
                .order_by(IncidentModel.first_reported_at.asc())
            )

            incidents = result.scalars().all()
            incidents_data = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
            await set_cache(cache_key, [i.model_dump_json() for i in incidents_data], expiration=3600)
            return incidents_data

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error in get_all_incidents")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")