from fastapi import HTTPException, UploadFile, status
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.models.response import Response
from app.schemas.incident_schema import IncidentData
from app.utils.caching import set_cache, get_cache
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from app.utils.cache_invalidator_optimized import invalidate_cache
from app.utils.cache_invalidator_optimized import CacheInvalidator
from app.tasks.notification_tasks import send_notifications_task
from app.models.response import Response
from app.services.attachment_services import enqueue_response_attachments
from fastapi.responses import JSONResponse
from app.models.department_account import DepartmentAccount
from app.schemas.response_schema import ResponseCreateSchema
from app.models.complaint import Complaint
from app.models.barangay import Barangay
from app.models.category import Category
from app.models.complaint_logs import ComplaintLogs
from sqlalchemy import select, func, update
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from app.constants.complaint_status import ComplaintStatus
from typing import List
from app.services.complaint_services import log_status_change
from app.utils.query_optimization import QueryOptions, BatchLoader, StatisticsHelper


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
                Complaint.status.in_([
                    ComplaintStatus.FORWARDED_TO_LGU.value,
                    ComplaintStatus.REVIEWED_BY_LGU.value,
                    ComplaintStatus.RESOLVED_BY_LGU.value,
                    ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
                ]),
                IncidentModel.barangay_id == barangay_id
            )
            .options(*QueryOptions.incident_full())
            .distinct()
            .order_by(IncidentModel.first_reported_at.asc())
        )
        logger.info(f"Executed query to get forwarded incidents for barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} forwarded incidents for barangay ID: {barangay_id}")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"forwarded_barangay_incidents:{barangay_id}", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
      
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in get_forwarded_incidents_by_barangay")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
      
      
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
            .where(Complaint.status.in_([
                ComplaintStatus.FORWARDED_TO_LGU.value,
                ComplaintStatus.REVIEWED_BY_LGU.value,
            ]))
            .options(*QueryOptions.incident_full())
            .distinct()
            .order_by(IncidentModel.first_reported_at.asc())
        )
        logger.info("Executed query to get all forwarded incidents")
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} total forwarded incidents")
        incidents_list = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache("all_forwarded_incidents", [i.model_dump_json() for i in incidents_list], expiration=3600)
        return incidents_list
    
    except HTTPException:
        raise
    
    except Exception:
        logger.exception("Error in get_all_forwarded_incidents")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    
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
                    ComplaintStatus.REVIEWED_BY_LGU.value,
                    ComplaintStatus.RESOLVED_BY_LGU.value,
                    ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
                ])
            )
            .group_by(func.date(Complaint.created_at), Complaint.status)
        )
        
        stats = result.all()
        
        daily_counts = {}
        for stat in stats:
            date_str = stat.date.isoformat()
            if date_str not in daily_counts:
                daily_counts[date_str] = {
                    "forwarded": 0,
                    "forwarded_to_department": 0,
                    "resolved": 0,
                    "under_review": 0,
                }
            
            if stat.status == ComplaintStatus.FORWARDED_TO_LGU.value:
                daily_counts[date_str]["forwarded"] = stat.count
            elif stat.status == ComplaintStatus.FORWARDED_TO_DEPARTMENT.value:
                daily_counts[date_str]["forwarded_to_department"] = stat.count
            elif stat.status == ComplaintStatus.RESOLVED_BY_LGU.value:
                daily_counts[date_str]["resolved"] = stat.count
            elif stat.status == ComplaintStatus.REVIEWED_BY_LGU.value:
                daily_counts[date_str]["under_review"] = stat.count

        # Keep forwarded buckets sticky by deriving them from status-change logs.
        forwarded_ids_by_day = {}
        forwarded_to_dept_ids_by_day = {}

        forwarded_logs = await db.execute(
            select(
                ComplaintLogs.complaint_id,
                func.date(Complaint.created_at).label('date')
            )
            .join(Complaint, Complaint.id == ComplaintLogs.complaint_id)
            .where(
                func.date(Complaint.created_at) >= week_ago,
                ComplaintLogs.new_status == ComplaintStatus.FORWARDED_TO_LGU.value,
            )
        )

        for row in forwarded_logs.all():
            if not row.date:
                continue
            date_str = row.date.isoformat()
            if date_str not in forwarded_ids_by_day:
                forwarded_ids_by_day[date_str] = set()
            forwarded_ids_by_day[date_str].add(row.complaint_id)
            if date_str not in daily_counts:
                daily_counts[date_str] = {
                    "forwarded": 0,
                    "forwarded_to_department": 0,
                    "resolved": 0,
                    "under_review": 0,
                }

        forwarded_to_department_logs = await db.execute(
            select(
                ComplaintLogs.complaint_id,
                func.date(Complaint.created_at).label('date')
            )
            .join(Complaint, Complaint.id == ComplaintLogs.complaint_id)
            .where(
                func.date(Complaint.created_at) >= week_ago,
                ComplaintLogs.new_status == ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
            )
        )

        for row in forwarded_to_department_logs.all():
            if not row.date:
                continue
            date_str = row.date.isoformat()
            if date_str not in forwarded_to_dept_ids_by_day:
                forwarded_to_dept_ids_by_day[date_str] = set()
            forwarded_to_dept_ids_by_day[date_str].add(row.complaint_id)
            if date_str not in daily_counts:
                daily_counts[date_str] = {
                    "forwarded": 0,
                    "forwarded_to_department": 0,
                    "resolved": 0,
                    "under_review": 0,
                }

        for date_str, complaint_ids in forwarded_ids_by_day.items():
            daily_counts[date_str]["forwarded"] = len(complaint_ids)

        for date_str, complaint_ids in forwarded_to_dept_ids_by_day.items():
            daily_counts[date_str]["forwarded_to_department"] = len(complaint_ids)

        return {"daily_counts": daily_counts}
    
    except HTTPException:
        raise
    
    except Exception:
        logger.exception("Error in weekly_forwarded_incidents_stats")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


async def complaint_counts_by_barangay_category(db: AsyncSession):
    try:
        cache_key = "lgu:complaint_counts_by_barangay_category"
        cached = await get_cache(cache_key)
        if cached is not None:
            logger.info("Cache hit for complaint counts by barangay and category")
            return cached

        barangays = (await db.execute(
            select(Barangay).order_by(Barangay.barangay_name.asc())
        )).scalars().all()

        categories = (await db.execute(
            select(Category).order_by(Category.category_name.asc())
        )).scalars().all()

        result = await db.execute(
            select(
                Complaint.barangay_id,
                Complaint.category_id,
                func.count(Complaint.id).label("count")
            )
            .group_by(Complaint.barangay_id, Complaint.category_id)
        )

        counts = {(row.barangay_id, row.category_id): row.count for row in result.all()}

        data = []
        for barangay in barangays:
            category_counts = []
            for category in categories:
                category_counts.append({
                    "category_id": category.id,
                    "category_name": category.category_name,
                    "count": counts.get((barangay.id, category.id), 0)
                })

            data.append({
                "barangay_id": barangay.id,
                "barangay_name": barangay.barangay_name,
                "categories": category_counts
            })

        payload = {
            "barangays": [{"id": b.id, "name": b.barangay_name} for b in barangays],
            "categories": [{"id": c.id, "name": c.category_name} for c in categories],
            "data": data
        }

        await set_cache(cache_key, payload, expiration=3600)
        return payload

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in complaint_counts_by_barangay_category")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    
   
async def assign_incident_to_department(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, department_account_id: int, attachments: List[UploadFile], db: AsyncSession):
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
        
        await log_status_change(
            complaint_ids=complaint_ids,
            new_status=ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
            changed_by_user_id=responder_id,
            db=db
        )
        await db.commit()
        
        complaints_result = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)))
        complaints = complaints_result.scalars().all()

        for complaint in complaints:
            send_notifications_task.delay(
                user_id=complaint.user_id,
                title="Complaint Forwarded to Department",
                message="Your complaint has been forwarded to the department for further processing.",
                complaint_id=complaint.id,
                notification_type="update"
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
            select(IncidentModel)
            .options(
                selectinload(IncidentModel.department_account).selectinload(DepartmentAccount.user)
            ).where(IncidentModel.id == incident_id)
        )
        incident = result.scalars().first()
        if incident and incident.department_account and incident.department_account.user:
            send_notifications_task.delay(
                user_id=incident.department_account.user.id,
                title="New Incident Assigned",
                message=f"A new incident with ID {incident.id} has been forwarded to your department.",
                complaint_id=None,
                notification_type="update"
            )
            
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in complaints],
            barangay_id=barangay_id,
            incident_ids=[incident_id],
            department_account_id=department_account_id,
            include_global=True
        )
            
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been forwarded to the department"}
        )
    
    except HTTPException:
        raise
    
    except Exception:
        await db.rollback()
        logger.exception("Error in assign_incident_to_department")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")