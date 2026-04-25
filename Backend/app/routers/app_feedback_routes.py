from fastapi import HTTPException, status, Depends, APIRouter, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db_dependency import get_async_db
from app.dependencies.auth_dependency import get_current_user
from app.services.app_feedback_services import submit_app_feedback, get_all_app_feedback, post_incident_feedback, get_all_post_incident_feedback, get_resolver_feedbacks
from app.schemas.app_feedback_schema import AppFeedbackCreate, AppFeedbackResponse, PostIncidentFeedbackCreate
from app.models.user import User
from app.dependencies.rate_limiter import limiter

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_all_app_feedback(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_app_feedback(db)
  
@router.post("/submit", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_app_feedback(request: Request, feedbackData: AppFeedbackCreate, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await submit_app_feedback(feedbackData, current_user.id, db)

@router.post("/post-incident", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_post_incident_feedback(request: Request, feedbackData: PostIncidentFeedbackCreate, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await post_incident_feedback(feedbackData, current_user.id, db)

@router.get("/my-resolved-incidents", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_my_resolved_incidents_feedback(request: Request, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_resolver_feedbacks(current_user.id, db)

@router.get("/post-incident/{incident_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def read_post_incident_feedback(request: Request, incident_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await get_all_post_incident_feedback(incident_id, db)
