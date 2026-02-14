from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.models.complaint import Complaint
from sqlalchemy import select
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData
from datetime import datetime
from app.utils.logger import logger

async def get_complaints_by_sector(sector_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.sector_id == sector_id)
        )
        complaints = result.scalars().all()
        logger.info(f"Fetched complaints for sector {sector_id}: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_complaints_by_sector: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def submit_complaint(complaint_data: ComplaintCreateData, user_id: int, db: AsyncSession):
    
    try:
        if not complaint_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid complaint data")
    
        new_complaint = Complaint(
            title=complaint_data.title,
            description=complaint_data.description,
            location_details=complaint_data.location_details,
            barangay_id=complaint_data.barangay_id,
            category_id=complaint_data.category_id,
            sector_id=complaint_data.sector_id,
            priority_level_id=complaint_data.priority_level_id,
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(new_complaint)
        await db.commit()
        await db.refresh(new_complaint)
        logger.info(f"Submitted new complaint: {new_complaint}")
        return ComplaintWithUserData.model_validate(new_complaint, from_attributes=True)
    
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error in submit_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
 