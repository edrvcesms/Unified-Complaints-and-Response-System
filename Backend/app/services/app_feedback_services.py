from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.app_feedback import AppFeedback
from app.models.user import User
from app.models.post_incident_feedback import PostIncidentFeedback
from app.models.incident_complaint import IncidentComplaintModel
from app.models.incident_model import IncidentModel
from app.models.complaint import Complaint
from app.models.response import Response
from app.constants.complaint_status import ComplaintStatus
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.app_feedback_schema import AppFeedbackCreate, AppFeedbackResponse, PostIncidentFeedbackCreate, PostIncidentFeedbackResponse
from datetime import datetime, timezone
from app.utils.logger import logger

async def submit_app_feedback(feedbackData: AppFeedbackCreate, user_id: int, db: AsyncSession) -> AppFeedbackResponse:
    
    try:
        result = await db.execute(
          select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        new_feedback = AppFeedback(
            user_id=user_id,
            ratings=feedbackData.ratings,
            message=feedbackData.message,
            created_at=datetime.now(timezone.utc)
        )
        new_feedback.user = user
        
        db.add(new_feedback)
        await db.commit()
        return AppFeedbackResponse.model_validate(new_feedback)
      
    except HTTPException: 
      raise
    
    except Exception as e:
      logger.error(f"Error submitting app feedback: {str(e)}")
      raise HTTPException(
          status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
          detail=f"Error submitting app feedback: {str(e)}"
      )
      
async def get_all_app_feedback(db: AsyncSession) -> list[AppFeedbackResponse]:
    try:
        result = await db.execute(select(AppFeedback).options(selectinload(AppFeedback.user)).order_by(AppFeedback.created_at.desc()))
        feedbacks = result.scalars().all()
        return [AppFeedbackResponse.model_validate(feedback) for feedback in feedbacks]
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error retrieving app feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving app feedback: {str(e)}"
        )
        

async def post_incident_feedback(feedbackData: PostIncidentFeedbackCreate, user_id: int, db: AsyncSession) -> PostIncidentFeedbackResponse:
    try:
        result = await db.execute(
            select(IncidentModel).where(IncidentModel.id == feedbackData.incident_id)
        )
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )

        complaints_result = await db.execute(
            select(Complaint.status)
            .join(IncidentComplaintModel, IncidentComplaintModel.complaint_id == Complaint.id)
            .where(IncidentComplaintModel.incident_id == feedbackData.incident_id)
        )
        complaint_statuses = complaints_result.scalars().all()
        if not complaint_statuses:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No complaints found for this incident"
            )

        resolved_statuses = {
            ComplaintStatus.RESOLVED_BY_BARANGAY.value,
            ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
            ComplaintStatus.RESOLVED_BY_LGU.value,
        }

        if any(status not in resolved_statuses for status in complaint_statuses):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot submit feedback for an unresolved incident"
            )
            
        new_feedback = PostIncidentFeedback(
            user_id=user_id,
            incident_id=feedbackData.incident_id,
            ratings=feedbackData.ratings,
            message=feedbackData.message,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_feedback)
        await db.commit()
        feedback_result = await db.execute(
            select(PostIncidentFeedback)
            .options(
                selectinload(PostIncidentFeedback.user),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.category),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.barangay),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.user),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.barangay),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.category),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.department_account),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.attachment),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.responses).selectinload(Response.response_attachments),
               
            )
            .where(PostIncidentFeedback.id == new_feedback.id)
        )
        saved_feedback = feedback_result.scalar_one()
        return PostIncidentFeedbackResponse.model_validate(saved_feedback)
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error submitting post-incident feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting post-incident feedback: {str(e)}"
        )
        
async def get_all_post_incident_feedback(incident_id: int, db: AsyncSession) -> list[PostIncidentFeedbackResponse]:
    try:
        result = await db.execute(
            select(PostIncidentFeedback)
            .options(
                selectinload(PostIncidentFeedback.user),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.category),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.barangay),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.user),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.barangay),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.category),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.department_account),
                selectinload(PostIncidentFeedback.incident)
                .selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.attachment),
                selectinload(PostIncidentFeedback.incident).selectinload(IncidentModel.responses).selectinload(Response.response_attachments)
            )
            .where(PostIncidentFeedback.incident_id == incident_id)
            .order_by(PostIncidentFeedback.created_at.desc())
        )
        feedbacks = result.scalars().all()
        return [PostIncidentFeedbackResponse.model_validate(feedback) for feedback in feedbacks]
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error retrieving post-incident feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving post-incident feedback: {str(e)}"
        )