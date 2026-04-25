from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_schema import BarangayWithUserData
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.response_schema import ResponseCreateSchema
from app.utils.cache_invalidator_optimized import invalidate_cache
from app.tasks import send_notifications_task, save_response_task
from fastapi.responses import JSONResponse
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
from app.models.department_account import DepartmentAccount
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.constants.complaint_status import ComplaintStatus
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from app.utils.caching import set_cache, get_cache
from app.utils.logger import logger
import asyncio
from typing import List, Optional, Dict
from datetime import datetime, timezone

async def get_barangay_account(user_id: int, db: AsyncSession) -> BarangayWithUserData:
    try:
        cached_barangay = await get_cache(f"barangay_profile:{user_id}")
        if cached_barangay:
            logger.info(f"Barangay profile for user ID {user_id} retrieved from cache")
            barangay_from_cache = BarangayWithUserData.model_validate_json(cached_barangay)
            return barangay_from_cache
        
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
            .where(Barangay.barangay_account.has(BarangayAccount.user_id == user_id))
        )
        barangay = result.scalars().first()
        if not barangay:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
        
        barangay_with_user_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
        logger.info(f"🔍 DB DEBUG - User ID: {user_id}, DB Barangay: {barangay_with_user_data.barangay_name}")
        await set_cache(f"barangay_profile:{user_id}", barangay_with_user_data.model_dump_json(), expiration=3600)
        logger.info(f"Barangay profile for user ID {user_id} retrieved from database and cached")
        return barangay_with_user_data
    
    except HTTPException:
        raise

    except Exception:
        logger.exception("Error in get_barangay_data")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

async def get_barangay_by_id(barangay_id: int, db: AsyncSession) -> BarangayWithUserData:
    try:
        cached_barangay = await get_cache(f"barangay_by_id:{barangay_id}")
        if cached_barangay:
            logger.info(f"Barangay ID {barangay_id} retrieved from cache")
            return BarangayWithUserData.model_validate_json(cached_barangay)
        
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
            .where(Barangay.id == barangay_id)
        )
        logger.info(f"Executed query to get barangay with ID: {barangay_id}")
        barangay = result.scalars().first()
        logger.info(f"Fetched barangay with ID: {barangay_id}")
        if not barangay:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
        
        barangay_with_user_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
        await set_cache(f"barangay_by_id:{barangay.id}", barangay_with_user_data.model_dump_json(), expiration=3600)
        logger.info(f"Barangay ID {barangay_id} retrieved from database and cached")
        return barangay_with_user_data
    
    except HTTPException:
        raise

    except Exception:
        logger.exception("Error in get_barangay_by_id")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    

async def get_all_barangays(
    db: AsyncSession,
    user_id: Optional[int] = None,
) -> List[BarangayWithUserData]:

    try:
        cached_barangays = await get_cache("all_barangays")

        if cached_barangays:
            logger.debug("Barangays from cache")
            all_barangays = [
                BarangayWithUserData.model_validate_json(b)
                for b in cached_barangays
            ]
        else:
            result = await db.execute(
                select(Barangay)
                .options(
                    selectinload(Barangay.barangay_account)
                    .selectinload(BarangayAccount.user)
                )
                .where(Barangay.barangay_account.has())
            )

            barangays = result.scalars().all()

            all_barangays = [
                BarangayWithUserData.model_validate(b, from_attributes=True)
                for b in barangays
            ]

            await set_cache(
                "all_barangays",
                [b.model_dump_json() for b in all_barangays],
                expiration=360
            )

        if not all_barangays:
            return []

        barangay_ids = [b.id for b in all_barangays]

        count_result = await db.execute(
            select(
                Complaint.barangay_id,
                func.count(func.distinct(IncidentComplaintModel.incident_id))
            )
            .join(
                IncidentComplaintModel,
                Complaint.id == IncidentComplaintModel.complaint_id
            )
            .where(
                Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value,
                Complaint.barangay_id.in_(barangay_ids)
            )
            .group_by(Complaint.barangay_id)
        )

        counts_map: Dict[int, int] = {
            row[0]: row[1] for row in count_result
        }

        for b in all_barangays:
            b.forwarded_incident_count = counts_map.get(b.id, 0)

        if user_id:
            cache_keys = [
                f"barangay_last_viewed:{user_id}:{bid}"
                for bid in barangay_ids
            ]

            last_viewed_values = await asyncio.gather(
                *[get_cache(key) for key in cache_keys]
            )

            last_viewed_map: Dict[int, datetime] = {}

            for bid, value in zip(barangay_ids, last_viewed_values):
                if value:
                    last_viewed_map[bid] = datetime.fromisoformat(value)

            if not last_viewed_map:
                for b in all_barangays:
                    b.new_forwarded_incident_count = b.forwarded_incident_count
            else:
                conditions = []

                for bid, last_viewed in last_viewed_map.items():
                    conditions.append(
                        (Complaint.barangay_id == bid) &
                        (Complaint.forwarded_at > last_viewed)
                    )

                if conditions:
                    from sqlalchemy import or_

                    new_count_result = await db.execute(
                        select(
                            Complaint.barangay_id,
                            func.count(func.distinct(IncidentComplaintModel.incident_id))
                        )
                        .join(
                            IncidentComplaintModel,
                            Complaint.id == IncidentComplaintModel.complaint_id
                        )
                        .where(
                            Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value,
                            or_(*conditions)
                        )
                        .group_by(Complaint.barangay_id)
                    )

                    new_counts_map: Dict[int, int] = {
                        row[0]: row[1] for row in new_count_result
                    }
                else:
                    new_counts_map = {}

                for b in all_barangays:
                    if b.id in last_viewed_map:
                        b.new_forwarded_incident_count = new_counts_map.get(b.id, 0)
                    else:
                        b.new_forwarded_incident_count = b.forwarded_incident_count

        else:
            for b in all_barangays:
                b.new_forwarded_incident_count = 0

        return all_barangays

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error in get_all_barangays")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch barangays"
        )

async def mark_barangay_incidents_viewed(user_id: int, barangay_id: int):
    """Mark that a user has viewed a barangay's incidents at this timestamp"""
    try:
        current_time = datetime.now(timezone.utc).isoformat()
        await set_cache(f"barangay_last_viewed:{user_id}:{barangay_id}", current_time, expiration=2592000)
        logger.info(f"Marked barangay {barangay_id} as viewed by user {user_id} at {current_time}")
        return {"message": "Barangay incidents marked as viewed", "viewed_at": current_time}
    except Exception:
        logger.exception("Error marking barangay as viewed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    
async def assign_incident_to_department(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, department_account_id: int, db: AsyncSession):
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
                
        save_response_task.delay(
            incident_id=incident_id,
            responder_id=responder_id,
            actions_taken=response_data.actions_taken
        )
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