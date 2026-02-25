from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.lgu_services import get_forwarded_incidents_by_barangay
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from app.models.user import User
from app.constants.roles import UserRole
from app.utils.logger import logger


router = APIRouter()

@router.get("/forwarded-incidents/{barangay_id}", status_code=status.HTTP_200_OK)
async def get_forwarded_incidents(barangay_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    
    if current_user.role != UserRole.LGU_OFFICIAL:
        logger.warning(f"Unauthorized access attempt by user ID: {current_user.id} with role: {current_user.role}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this resource.")
    
    return await get_forwarded_incidents_by_barangay(barangay_id, db)
