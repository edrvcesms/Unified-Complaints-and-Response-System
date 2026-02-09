from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.complaint import Complaint
from app.schemas.complaint_schema import ComplaintCreateData
from datetime import datetime

async def submit_complaint(complaint_data: ComplaintCreateData, user_id: int, db: AsyncSession):
    
    if not complaint_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid complaint data")
    
    new_complaint = Complaint(
        title=complaint_data.title,
        description=complaint_data.description,
        location_details=complaint_data.location_details,
        status=complaint_data.status,
        barangay_id=complaint_data.barangay_id,
        category_id=complaint_data.category_id,
        sector_id=complaint_data.sector_id,
        priority_id=complaint_data.priority_id,
        user_id=user_id,
        created_at=datetime.utcnow()
    )
    db.add(new_complaint)
    await db.commit()
    await db.refresh(new_complaint)
    return new_complaint

