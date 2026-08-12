from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from app.services.emergency_queue import get_active_emergencies, remove_emergency
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.utils.redis_pub import publish_sse_event

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_emergency_queue(current_user: User = Depends(get_current_user)):
    try:
        emergencies = await get_active_emergencies(current_user.id)
        return JSONResponse(content={"emergencies": emergencies}, status_code=status.HTTP_200_OK)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
      
@router.delete("/{incident_id}/remove", status_code=status.HTTP_200_OK)
async def remove_emergency_from_queue(incident_id: int, current_user: User = Depends(get_current_user)):
    try:
        await remove_emergency(current_user.id, incident_id)
        await publish_sse_event(
            "sse:user",
            {
                "target": str(current_user.id),
                "event": "emergency_removed",
                "data": {"incident_id": incident_id},
            },
        )
        return JSONResponse(content={"message": "Emergency removed from queue"}, status_code=status.HTTP_200_OK)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)