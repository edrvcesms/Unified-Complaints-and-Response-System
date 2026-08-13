from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_schema import BarangayWithUserData
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.response_schema import ResponseCreateSchema
from app.utils.cache_invalidator_optimized import invalidate_cache
from app.tasks.notification_tasks import send_notifications_task
from app.tasks.response_tasks import save_response_task
from fastapi.responses import JSONResponse
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
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
from app.core.pagination import paginate
from app.core.pagination_params import ListParams
from app.core.pagination_response import PaginatedResponse

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
    params: ListParams,
    user_id: Optional[int] = None,
) -> PaginatedResponse[BarangayWithUserData]:

    try:
        statement = (
            select(Barangay)
            .options(selectinload(Barangay.barangay_account))
            .where(Barangay.barangay_account.has())
            .order_by(Barangay.barangay_name.asc())
        )
        page = await paginate(db, statement, params, mapper=lambda item: BarangayWithUserData.model_validate(item, from_attributes=True))
        response = PaginatedResponse[BarangayWithUserData].model_validate(page)
        all_barangays = response.data

        if not all_barangays:
            return response

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

        return response

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
   