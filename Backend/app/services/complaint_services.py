from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.models.complaint import Complaint
from sqlalchemy import select
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse

async def get_all_complaints(db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)))
        complaints = result.scalars().all()
        logger.info(f"Fetched all complaints: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_under_review_complaints(db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.UNDER_REVIEW.value))
        complaints = result.scalars().all()
        logger.info(f"Fetched all under review complaints: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_under_review_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_resolved_complaints(db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.RESOLVED.value))
        complaints = result.scalars().all()
        logger.info(f"Fetched all resolved complaints: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_resolved_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_submitted_complaints(db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.SUBMITTED.value))
        complaints = result.scalars().all()
        logger.info(f"Fetched all submitted complaints: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_submitted_complaints: {e}")
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
            status=ComplaintStatus.SUBMITTED.value,
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
    
async def review_complaints(complaint_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
        complaint = result.scalars().first()
        
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        complaint.status = ComplaintStatus.UNDER_REVIEW.value
        await db.commit()
        logger.info(f"Complaint with ID {complaint_id} is now under review")
        return JSONResponse(content={"message": f"Complaint with ID {complaint_id} is now under review"})
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in review_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def resolve_complaint(complaint_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
        complaint = result.scalars().first()
        
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        complaint.status = ComplaintStatus.RESOLVED.value
        await db.commit()
        logger.info(f"Complaint with ID {complaint_id} has been resolved")
        return JSONResponse(content={"message": f"Complaint with ID {complaint_id} has been resolved"})
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in resolve_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

    
async def get_my_complaints(user_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.user_id == user_id)
        )
        complaints = result.scalars().all()
        logger.info(f"Fetched complaints for user {user_id}: {complaints}")
        return [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_my_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def delete_complaint(complaint_id: int, user_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
        complaint = result.scalars().first()

        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        if complaint.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this complaint")
        
        await db.delete(complaint)
        await db.commit()
        logger.info(f"Deleted complaint with ID {complaint_id} by user {user_id}")
        return {"message": "Complaint deleted successfully"}
    
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error in delete_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))