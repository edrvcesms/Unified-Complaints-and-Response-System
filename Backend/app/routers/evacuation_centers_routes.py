from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.dependencies.db_dependency import get_async_db
from app.admin._super_admin_services import get_barangay_evacuation_centers, get_user_evacuation_centers
from app.admin._super_admin_schemas import EvacuationCenters

router = APIRouter()

@router.get("/barangay/{barangay_id}", status_code=status.HTTP_200_OK)
async def get_evacuation_centers_by_barangay(barangay_id: int, current_user: User = Depends(get_current_user), db=Depends(get_async_db)):
    try:
        return await get_barangay_evacuation_centers(barangay_id, current_user.id, db)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
@router.get("/nearby", status_code=status.HTTP_200_OK)
async def get_nearby_evacuation_centers(current_user: User = Depends(get_current_user), db=Depends(get_async_db)):
    try:
        return await get_user_evacuation_centers(current_user.id, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      