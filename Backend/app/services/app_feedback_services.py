from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.app_feedback import AppFeedback
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.app_feedback_schema import AppFeedbackCreate, AppFeedbackResponse
from datetime import datetime
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
            created_at=datetime.utcnow()
        )
        
        db.add(new_feedback)
        await db.commit()
        await db.refresh(new_feedback)
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