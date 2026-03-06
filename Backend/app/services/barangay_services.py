from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_schema import BarangayAccountCreate, BarangayWithUserData
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.constants.complaint_status import ComplaintStatus
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.utils.caching import set_cache, get_cache, delete_cache
from app.utils.logger import logger
from typing import List, Optional
from datetime import datetime

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

    except Exception as e:
        logger.error(f"Error in get_barangay_data: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_barangay_by_id(barangay_id: int, db: AsyncSession) -> BarangayWithUserData:
    try:
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
        await set_cache(f"barangay_profile:{barangay.id}", barangay_with_user_data.model_dump_json(), expiration=3600)
        return barangay_with_user_data
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_barangay_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def get_all_barangays(db: AsyncSession, user_id: Optional[int] = None) -> List[BarangayWithUserData]:
    try:
        # Don't use cache if we need to calculate per-user new incident counts
        if user_id is None:
            cached_barangays = await get_cache("all_barangays")
            if cached_barangays:
                logger.info("All barangays retrieved from cache")
                return [BarangayWithUserData.model_validate_json(barangay) for barangay in cached_barangays]
        
        result = await db.execute(
            select(Barangay)
            .options(
                selectinload(Barangay.barangay_account).selectinload(BarangayAccount.user)
            )
            .where(Barangay.barangay_account.has())
        )
        barangays = result.scalars().all()
        logger.info(f"Fetched all barangays: {len(barangays)} barangays found")
        
        all_barangays = []
        for barangay in barangays:
            barangay_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
            
            # Count all forwarded incidents for this barangay
            count_result = await db.execute(
                select(func.count(func.distinct(IncidentComplaintModel.incident_id)))
                .select_from(Complaint)
                .join(IncidentComplaintModel, Complaint.id == IncidentComplaintModel.complaint_id)
                .where(
                    Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value,
                    Complaint.barangay_id == barangay.id
                )
            )
            barangay_data.forwarded_incident_count = count_result.scalar() or 0
            
            # Count new forwarded incidents (if user_id is provided)
            if user_id:
                # Get the last viewed timestamp for this barangay by this user
                last_viewed_str = await get_cache(f"barangay_last_viewed:{user_id}:{barangay.id}")
                
                if last_viewed_str:
                    # Parse the timestamp
                    last_viewed = datetime.fromisoformat(last_viewed_str)
                    
                    # Count incidents forwarded after the last viewed timestamp
                    new_count_result = await db.execute(
                        select(func.count(func.distinct(IncidentComplaintModel.incident_id)))
                        .select_from(Complaint)
                        .join(IncidentComplaintModel, Complaint.id == IncidentComplaintModel.complaint_id)
                        .where(
                            Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value,
                            Complaint.barangay_id == barangay.id,
                            Complaint.forwarded_at > last_viewed
                        )
                    )
                    barangay_data.new_forwarded_incident_count = new_count_result.scalar() or 0
                else:
                    # If never viewed before, all forwarded incidents are new
                    barangay_data.new_forwarded_incident_count = barangay_data.forwarded_incident_count
            else:
                barangay_data.new_forwarded_incident_count = 0
            
            all_barangays.append(barangay_data)
        
        # Only cache if we're not calculating per-user data
        if user_id is None:
            await set_cache("all_barangays", [barangay.model_dump_json() for barangay in all_barangays], expiration=3600)
        
        return all_barangays
   
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_barangays: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def mark_barangay_incidents_viewed(user_id: int, barangay_id: int):
    """Mark that a user has viewed a barangay's incidents at this timestamp"""
    try:
        current_time = datetime.utcnow().isoformat()
        await set_cache(f"barangay_last_viewed:{user_id}:{barangay_id}", current_time, expiration=2592000)  # 30 days
        logger.info(f"Marked barangay {barangay_id} as viewed by user {user_id} at {current_time}")
        return {"message": "Barangay incidents marked as viewed", "viewed_at": current_time}
    except Exception as e:
        logger.error(f"Error marking barangay as viewed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    