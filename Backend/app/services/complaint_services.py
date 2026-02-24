import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.models.complaint import Complaint
from sqlalchemy import select
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData,MyComplaintData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse
from app.utils.caching import set_cache, get_cache, delete_cache
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase
from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.infrastracture.llm.gemini_incident_verifier import GeminiIncidentVerifier
from app.domain.repository.incident_repository import IncidentRepository
from app.core.config import settings


_embedding_service = SentenceTransformerEmbeddingService()
_vector_repository = PineconeVectorRepository(
    api_key=settings.PINECONE_API_KEY,
    environment=settings.PINECONE_ENVIRONMENT,
)

_gemini_verifier = GeminiIncidentVerifier(api_key=os.getenv("GEMINI_API_KEY"))

_severity_calculator = WeightedSeverityCalculator()

async def get_complaint_by_id(complaint_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.department), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.id == complaint_id))
        complaint = result.scalars().first()
        
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        logger.info(f"Fetched complaint with ID {complaint_id}: {complaint}")
        
        return ComplaintWithUserData.model_validate(complaint, from_attributes=True)
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_complaint_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_all_complaints(db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.department), selectinload(Complaint.category), selectinload(Complaint.priority_level)))
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched all complaints: {complaints}")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        
        return complaints_list
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_weekly_complaint_stats(db: AsyncSession):
    try:
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(Complaint)
            .where(Complaint.created_at >= one_week_ago)
        )
        complaints = result.scalars().all()
        
        stats = {
            "total_submitted": len(complaints),
            "total_resolved": sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED.value),
            "daily_counts": {}
        }
        
        stats["daily_counts"] = {}
        for i in range(7):
            day = (datetime.utcnow() - timedelta(days=6-i)).strftime("%Y-%m-%d")
            stats["daily_counts"][day] = {"submitted": 0, "resolved": 0}
            
        for complaint in complaints:
            day = complaint.created_at.strftime("%Y-%m-%d")
            if day not in stats["daily_counts"]:
                stats["daily_counts"][day] = {"submitted": 0, "resolved": 0}
            stats["daily_counts"][day]["submitted"] += 1
            if complaint.status == ComplaintStatus.RESOLVED.value:
                stats["daily_counts"][day]["resolved"] += 1
        
        logger.info(f"Weekly complaint stats: {stats}")
        
        return stats
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_weekly_complaint_stats: {e}")
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
            status=ComplaintStatus.SUBMITTED.value,
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(new_complaint)
        await db.commit()
        await db.refresh(new_complaint)
        logger.info(f"Step 1 complete — complaint saved: id={new_complaint.id}")

        # Fetch category config (time window, base weight, threshold)
        incident_repo = IncidentRepository(db)
        category_config = await incident_repo.get_category_config(complaint_data.category_id)
        logger.info(
            f"Step 2 complete — category config fetched: "
            f"window={category_config['time_window_hours']}h, "
            f"weight={category_config['base_severity_weight']}, "
            f"threshold={category_config['similarity_threshold']}"
        )

        logger.info(f"Step 5 starting — clustering complaint id={new_complaint.id}")
        use_case = ClusterComplaintUseCase(
            embedding_service=_embedding_service,
            vector_repository=_vector_repository,
            incident_repository=incident_repo,
            incident_verifier=_gemini_verifier,
        )

        input_dto = ClusterComplaintInput(
            complaint_id=new_complaint.id,
            user_id=user_id,
            title=complaint_data.title,
            description=complaint_data.description,
            barangay_id=complaint_data.barangay_id,
            category_id=complaint_data.category_id,
            category_time_window_hours=category_config["time_window_hours"],
            category_base_severity_weight=category_config["base_severity_weight"],
            similarity_threshold=category_config["similarity_threshold"],
            created_at=datetime.utcnow(),
        )

        cluster_result = await use_case.execute(input_dto)
        await db.commit()

        if cluster_result.is_new_incident:
            logger.info(f"Step 5 complete — new incident created: id={cluster_result.incident_id}")
        else:
            logger.info(
                f"Step 5 complete — merged into existing incident: id={cluster_result.incident_id}, "
                f"similarity={cluster_result.similarity_score:.4f}"
            )

        # Recalculate severity for the incident ─────────────────────
        logger.info(f"Step 6 starting — recalculating severity for incident id={cluster_result.incident_id}")
        velocity_detector = DetectVelocitySpikeUseCase(incident_repo)
        severity_use_case = RecalculateSeverityUseCase(
            incident_repository=incident_repo,
            severity_calculator=_severity_calculator,
            velocity_detector=velocity_detector,
        )
        updated_incident = await severity_use_case.execute(cluster_result.incident_id)
        await db.commit()
        logger.info(
            f"Step 7 complete — severity updated: "
            f"score={updated_incident.severity_score}, "
            f"level={updated_incident.severity_level.value}"
        )

        #  Return complaint with full related data
        result = await db.execute(
            select(Complaint)
            .options(
                selectinload(Complaint.user),
                selectinload(Complaint.barangay),
                selectinload(Complaint.category),
            )
            .where(Complaint.id == new_complaint.id)
        )
        updated_complaint = result.scalars().first()

        logger.info(f"All steps complete — complaint id={new_complaint.id} fully processed")
        await delete_cache(f"user_complaints:{user_id}")
        return ComplaintWithUserData.model_validate(updated_complaint, from_attributes=True)

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
        delete_cache("all_complaints")
        logger.info(f"Complaint with ID {complaint_id} is now under review")
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.department), selectinload(Complaint.category), selectinload(Complaint.priority_level)))
        complaints = result.scalars().all()
        logger.info(f"Fetched all complaints after updating status: {complaints}")
        await set_cache("all_complaints", [ComplaintWithUserData.model_validate(complaint, from_attributes=True).model_dump_json() for complaint in complaints], expiration=1)
        logger.info(f"set cache for all complaints after review_complaints")
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
        complaint.resolved_at = datetime.utcnow()
        await db.commit()
        delete_cache("all_complaints")
        logger.info(f"Complaint with ID {complaint_id} has been resolved")
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.department), selectinload(Complaint.category), selectinload(Complaint.priority_level)))
        complaints = result.scalars().all()
        logger.info(f"Fetched all complaints after updating status: {complaints}")
        await set_cache("all_complaints", [ComplaintWithUserData.model_validate(complaint, from_attributes=True).model_dump_json() for complaint in complaints], expiration=1)
        return JSONResponse(content={"message": f"Complaint with ID {complaint_id} has been resolved"})
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in resolve_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    


async def get_my_complaints(user_id: int, db: AsyncSession):
    try:
        cached = await get_cache(f"user_complaints:{user_id}")
        if cached:
            logger.info(f"My complaints for user {user_id} retrieved from cache")
            return [MyComplaintData.model_validate_json(c) for c in cached]

        result = await db.execute(
            select(Complaint)
            .options(
                selectinload(Complaint.barangay),
                selectinload(Complaint.category),
            )
            .where(Complaint.user_id == user_id)
            .order_by(Complaint.created_at.desc())
        )
        complaints = result.scalars().all()

        if not complaints:
            return []

        user_complaints = [
            MyComplaintData.model_validate(c, from_attributes=True)
            for c in complaints
        ]

        await set_cache(
            f"user_complaints:{user_id}",
            [c.model_dump_json() for c in user_complaints],
            expiration=3600,
        )

        logger.info(f"Fetched {len(user_complaints)} complaints for user {user_id}")
        return user_complaints

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_my_complaints: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    
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
    