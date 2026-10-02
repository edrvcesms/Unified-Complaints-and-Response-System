from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.post_incident_feedback import PostIncidentFeedback
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.category_rates_schema import FeedbackPerCategory, CategoryRatesResponse
from app.models.category import Category
from app.models.complaint import Complaint
from app.constants.complaint_status import ComplaintStatus
from app.utils.caching import get_cache, set_cache

CATEGORY_FEEDBACK_RATES_CACHE_KEY = "category_feedback_rates"
CATEGORY_FEEDBACK_RATES_CACHE_TTL_SECONDS = 300

# this function will calculate the feedback rates per category and return the result as a CategoryRatesResponse object
async def get_feedback_rates_per_category(db: AsyncSession) -> CategoryRatesResponse:
    try:
        cached_rates = await get_cache(CATEGORY_FEEDBACK_RATES_CACHE_KEY)
        if cached_rates is not None:
            return CategoryRatesResponse.model_validate(cached_rates)

        result = await db.execute(
            select(
                func.count(Complaint.id).label("total_resolved"),
                func.coalesce(func.sum(PostIncidentFeedback.ratings), 0).label("total_rate"),
                func.coalesce(func.avg(PostIncidentFeedback.ratings), 0).label("average_rate")
            )
            .join(IncidentComplaintModel, IncidentComplaintModel.complaint_id == Complaint.id)
            .join(PostIncidentFeedback, PostIncidentFeedback.incident_id == IncidentComplaintModel.incident_id)
            .where(Complaint.status.in_([ComplaintStatus.RESOLVED_BY_LGU, ComplaintStatus.RESOLVED_BY_BARANGAY]))
        )
        total_resolved, total_rate, average_rate = result.fetchone()
        
        # now we will get the feedback rates per category
        result = await db.execute(
            select(
                Category.id.label("category_id"),
                Category.category_name.label("category_name"),
                func.count(PostIncidentFeedback.id).label("total_feedbacks"),
                func.coalesce(func.avg(PostIncidentFeedback.ratings), 0).label("average_rating"),
                func.count(Complaint.id).label("total_resolved"),
                func.coalesce(func.sum(PostIncidentFeedback.ratings), 0).label("total_rate")
            )
            .join(IncidentModel, IncidentModel.category_id == Category.id)
            .join(PostIncidentFeedback, PostIncidentFeedback.incident_id == IncidentModel.id)
            .join(IncidentComplaintModel, IncidentComplaintModel.incident_id == IncidentModel.id)
            .join(Complaint, Complaint.id == IncidentComplaintModel.complaint_id)
            .where(Complaint.status.in_([ComplaintStatus.RESOLVED_BY_LGU, ComplaintStatus.RESOLVED_BY_BARANGAY]))
            .group_by(Category.id)
        )
        categories = result.fetchall()
        response = CategoryRatesResponse(
            total_resolved=total_resolved,
            total_rate=total_rate,
            average_rate=average_rate,
            by_category=[
                FeedbackPerCategory(
                    category_id=cat.category_id,
                    category_name=cat.category_name,
                    total_feedbacks=cat.total_feedbacks,
                    average_rating=cat.average_rating,
                    total_resolved=cat.total_resolved,
                    total_rate=cat.total_rate
                ) for cat in categories
            ]
        )
        await set_cache(
            CATEGORY_FEEDBACK_RATES_CACHE_KEY,
            response.model_dump(mode="json"),
            CATEGORY_FEEDBACK_RATES_CACHE_TTL_SECONDS,
        )
        return response
        
    except HTTPException:
        raise
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
      
    