from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from app.schemas.response_schema import ResponseCreateSchema
from app.constants.complaint_status import ComplaintStatus
from app.models.incident_model import IncidentModel
from app.models.response import Response
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData, IncidentOut
from app.utils.caching import delete_cache
from app.utils.logger import logger
from app.models.complaint import Complaint
from app.tasks.notification_tasks import send_notifications_task, send_web_push_notification_task
from app.models.response import Response
from app.services.attachment_services import enqueue_response_attachments
from app.utils.caching import set_cache, get_cache
from app.models.user import User
from app.services.complaint_services import log_status_change
from app.constants.roles import UserRole
from app.utils.query_optimization import QueryOptions, BatchLoader
from app.utils.cache_invalidator_optimized import CacheInvalidator
from app.core.pagination import paginate
from app.core.pagination_params import ListParams
from app.core.pagination_response import PaginatedResponse
from app.utils.caching import DEFAULT_LIST_CACHE_TTL_SECONDS, EMPTY_LIST_CACHE_TTL_SECONDS, build_list_cache_key
from sqlalchemy import select, update, or_, case, cast, String, func
from app.core.pagination_params import IncidentListParams
from app.models.category import Category
from app.models.barangay import Barangay
from app.schemas.web_push_schema import PushNotificationPayload
from app.utils.incident_filter import _apply_incident_filters_and_sort, PRIORITY_SCORE

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

    return set()



async def get_incidents_by_barangay(barangay_id: int, db: AsyncSession, params: IncidentListParams) -> PaginatedResponse[IncidentOut]:
    try:
        cache_key = build_list_cache_key("incidents", params.model_dump(mode="json"), barangay_id=barangay_id, view="active")
        incidents_cache = await get_cache(cache_key)
        if incidents_cache is not None:
            logger.info(f"Cache hit for barangay ID: {barangay_id}")
            return PaginatedResponse[IncidentOut].model_validate(incidents_cache)

        active_statuses = [ComplaintStatus.SUBMITTED.value, ComplaintStatus.REVIEWED_BY_BARANGAY.value]

        subq = (
            select(IncidentComplaintModel.incident_id)
            .join(IncidentComplaintModel.complaint)
            .where(IncidentComplaintModel.incident_id == IncidentModel.id, Complaint.status.in_(active_statuses))
            .exists()
        )

        statement = (
            select(IncidentModel)
            .where(IncidentModel.barangay_id == barangay_id, subq)
            .options(*QueryOptions.incident_full())
        )

        # --- Filters ---
        if params.severity_level:
            statement = statement.where(IncidentModel.severity_level == params.severity_level)

        if params.severity_score_min is not None:
            statement = statement.where(IncidentModel.severity_score >= params.severity_score_min)

        if params.severity_score_max is not None:
            # Buckets are half-open ("4.0-5.9" == [4.0, 6.0)), so max is exclusive
            statement = statement.where(IncidentModel.severity_score < params.severity_score_max)

        if params.date_from:
            statement = statement.where(func.date(IncidentModel.first_reported_at) >= params.date_from)

        if params.date_to:
            statement = statement.where(func.date(IncidentModel.first_reported_at) <= params.date_to)

        if params.complaint_status:
            complaint_status_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(IncidentComplaintModel.incident_id == IncidentModel.id, Complaint.status == params.complaint_status)
                .exists()
            )
            statement = statement.where(complaint_status_filter)

        if params.search:
            term = f"%{params.search}%"
            statement = statement.where(or_(
                IncidentModel.title.ilike(term),
                cast(IncidentModel.id, String).ilike(term),
                select(Category.id).where(Category.id == IncidentModel.category_id, Category.category_name.ilike(term)).exists(),
                select(Barangay.id).where(Barangay.id == IncidentModel.barangay_id, Barangay.barangay_name.ilike(term)).exists(),
            ))

        # --- Sort ---
        sort_column = {
            "first_reported_at": IncidentModel.first_reported_at,
            "last_reported_at": IncidentModel.last_reported_at,
            "priority": PRIORITY_SCORE,
        }.get(params.sort, IncidentModel.first_reported_at)
        # Preserve old default (oldest-first) when no sort is specified
        default_order = "asc" if not params.sort else params.order
        statement = statement.order_by(sort_column.asc() if default_order == "asc" else sort_column.desc())

        page = await paginate(db, statement, params, mapper=lambda item: IncidentOut.model_validate(item, from_attributes=True))
        response = PaginatedResponse[IncidentOut].model_validate(page)
        await set_cache(cache_key, response.model_dump(mode="json"), expiration=DEFAULT_LIST_CACHE_TTL_SECONDS if response.data else EMPTY_LIST_CACHE_TTL_SECONDS)
        return response

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in get_incidents_by_barangay")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

    
async def get_incident_by_id(incident_id: int, db: AsyncSession):
    try:
        incident_cache = await get_cache(f"incident:{incident_id}")
        if incident_cache is not None:
            logger.info(f"Cache hit for incident ID: {incident_id}")
            return IncidentData.model_validate_json(incident_cache) if isinstance(incident_cache, str) else IncidentData.model_validate(incident_cache, from_attributes=True)
        
        result = await db.execute(
            select(IncidentModel)
            .options(*QueryOptions.incident_detail())
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
        
        result = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)))
        complaints = result.scalars().all()
        
        if complaints[0].is_rejected_by_lgu:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot forward incident. You cannot forward an incident that has been rejected by the LGU.")
        
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
        logger.info(f"Updated {len(complaint_ids)} complaints to FORWARDED_TO_LGU status for incident ID: {incident_id}")
        incident.new_complaint_count = len(complaint_ids)
        incident.has_new_complaints = True
        incident.updated_at = datetime.now(timezone.utc)
        if incident.hearing_date:
            incident.hearing_date = None
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
            await enqueue_response_attachments(attachments, response.id, responder_id, incident_id)
        
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
                notification_type="info",
                event="info"
            )
            payload = {
                "title": "New Incident Forwarded to LGU",
                "body": f"A new incident with ID {incident.id} has been forwarded to the LGU.",
                "icon": "https://cfms-stamaria.com/StaMariaLogo.jpg",
                "url": f"https://cfms-stamaria.com/lgu/incidents/{incident_id}"
            }
            send_web_push_notification_task.delay(
                user_id=official.id,
                payload=payload,
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
        
        await CacheInvalidator.invalidate_cache(
            incident_ids=[incident_id],
            barangay_id=incident.barangay_id,
            include_global=True
        )
        
        # Fetch updated incident with all relationships for response
        result = await db.execute(
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(*QueryOptions.incident_detail())
        )
        updated_incident = result.scalars().first()
        
        return IncidentData.model_validate(updated_incident, from_attributes=True)

    
    except HTTPException:
        raise
    
    except Exception:
        logger.exception("Error in mark_incident_as_viewed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


async def get_all_incidents(current_user: User, db: AsyncSession, params: IncidentListParams) -> PaginatedResponse[IncidentOut]:
    try:
        role = current_user.role
        active_statuses = _active_statuses_by_role(role)
        archive_statuses = [status_value for status_value in ComplaintStatus if status_value.value not in active_statuses]

        if role == UserRole.BARANGAY_OFFICIAL:
            barangay_account = getattr(current_user, "barangay_account", None)
            if not barangay_account:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay account not found for current user")

            barangay_id = barangay_account.barangay_id
            archive_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(
                    IncidentComplaintModel.incident_id == IncidentModel.id,
                    Complaint.status.in_([s.value for s in archive_statuses]),
                )
                .exists()
            )

            statement = (
                select(IncidentModel)
                .where(
                    IncidentModel.barangay_id == barangay_id,
                    archive_filter,
                )
                .options(*QueryOptions.incident_minimal())
            )
            statement = _apply_incident_filters_and_sort(statement, params)
            page = await paginate(db, statement, params, mapper=lambda item: IncidentOut.model_validate(item, from_attributes=True))
            return PaginatedResponse[IncidentOut].model_validate(page)

        if role == UserRole.LGU_OFFICIAL:
            archive_filter = (
                select(IncidentComplaintModel.incident_id)
                .join(IncidentComplaintModel.complaint)
                .where(
                    IncidentComplaintModel.incident_id == IncidentModel.id,
                    Complaint.status.in_([s.value for s in archive_statuses]),
                )
                .exists()
            )

            statement = (
                select(IncidentModel)
                .where(archive_filter)
                .options(*QueryOptions.incident_minimal())
            )
            statement = _apply_incident_filters_and_sort(statement, params)
            page = await paginate(db, statement, params, mapper=lambda item: IncidentOut.model_validate(item, from_attributes=True))
            return PaginatedResponse[IncidentOut].model_validate(page)

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error in get_all_incidents")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")