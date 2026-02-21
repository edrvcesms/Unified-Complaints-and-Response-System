import os

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
from app.utils.caching import set_cache, get_cache, delete_cache

from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase
from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.repository.incident_repository import IncidentRepository
from dotenv import load_dotenv

load_dotenv()
# Singletons — same as in tasks.py
_embedding_service = SentenceTransformerEmbeddingService()
_vector_repository = PineconeVectorRepository(
    api_key=os.getenv("PINECONE_API_KEY"),
    environment=os.getenv("PINECONE_ENVIRONMENT", "us-east-1"),
)
_severity_calculator = WeightedSeverityCalculator()

async def get_complaint_by_id(complaint_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.id == complaint_id))
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
        cached_complaints = await get_cache("all_complaints")
        if cached_complaints:
            logger.info("All complaints retrieved from cache")
            return [ComplaintWithUserData.model_validate_json(complaint) for complaint in cached_complaints]
        
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)))
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched all complaints: {complaints}")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        
        await set_cache("all_complaints", [complaint.model_dump_json() for complaint in complaints_list], expiration=1)
        
        return complaints_list
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_under_review_complaints(db: AsyncSession):
    try:
        cached_under_review_complaints = await get_cache("all_under_review_complaints")
        if cached_under_review_complaints:
            logger.info("All under review complaints retrieved from cache")
            return [ComplaintWithUserData.model_validate_json(complaint) for complaint in cached_under_review_complaints]
        
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.UNDER_REVIEW.value))
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched all under review complaints: {complaints}")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        await set_cache("all_under_review_complaints", [complaint.model_dump_json() for complaint in complaints_list], expiration=3600)
        return complaints_list
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_under_review_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_resolved_complaints(db: AsyncSession):
    try:
        cached_resolved_complaints = await get_cache("all_resolved_complaints")
        if cached_resolved_complaints:
            logger.info("All resolved complaints retrieved from cache")
            return [ComplaintWithUserData.model_validate_json(complaint) for complaint in cached_resolved_complaints]
        
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.RESOLVED.value))
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched all resolved complaints: {complaints}")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        
        await set_cache("all_resolved_complaints", [complaint.model_dump_json() for complaint in complaints_list], expiration=3600)
        
        return complaints_list
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_resolved_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_all_submitted_complaints(db: AsyncSession):
    try:
        cached_submitted_complaints = await get_cache("all_submitted_complaints")
        if cached_submitted_complaints:
            logger.info("All submitted complaints retrieved from cache")
            return [ComplaintWithUserData.model_validate_json(complaint) for complaint in cached_submitted_complaints]
        
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.status == ComplaintStatus.SUBMITTED.value))
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched all submitted complaints: {complaints}")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        await set_cache("all_submitted_complaints", [complaint.model_dump_json() for complaint in complaints_list], expiration=3600)
        return complaints_list
    
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

        # Generate embedding from complaint description ─────────────
        logger.info(f"Step 3 starting — generating embedding for complaint id={new_complaint.id}")
        embedding = await _embedding_service.generate(complaint_data.description)
        logger.info(f"Step 3 complete — embedding generated, dim={len(embedding)}")

        # Store embedding in Pinecone with metadata ─────────────────
        logger.info(f"Step 4 starting — upserting vector into Pinecone")
        created_at_dt = datetime.utcnow()
        await _vector_repository.upsert(
            complaint_id=new_complaint.id,
            embedding=embedding,
            barangay_id=complaint_data.barangay_id,
            category_id=complaint_data.category_id,
            incident_id=None,
            status="ACTIVE",
            created_at_unix=datetime.utcnow(),
        )
        logger.info(f"Step 4 complete — vector stored in Pinecone for complaint id={new_complaint.id}")

        #Query Pinecone for similar complaints 
        logger.info(f"Step 5 starting — querying Pinecone for similar complaints")
        time_window_cutoff_unix = (
            new_complaint.created_at.timestamp() - (category_config["time_window_hours"] * 3600)
        )
        similar = await _vector_repository.query_similar(
            embedding=embedding,
            barangay_id=complaint_data.barangay_id,
            category_id=complaint_data.category_id,
            time_window_cutoff_unix=time_window_cutoff_unix,
            top_k=1,
        )
        # 
        similar = [s for s in similar if s.complaint_id != new_complaint.id]
        logger.info(f"Step 5 complete — found {len(similar)} similar complaint(s)")

        # 
        logger.info(f"Step 6 starting — clustering complaint id={new_complaint.id}")
        use_case = ClusterComplaintUseCase(
            embedding_service=_embedding_service,
            vector_repository=_vector_repository,
            incident_repository=incident_repo,
        )

        input_dto = ClusterComplaintInput(
            complaint_id=new_complaint.id,
            user_id=user_id,
            title=complaint_data.title,
            description=complaint_data.description,
            barangay_id=complaint_data.barangay_id,
            category_id=complaint_data.category_id,
            sector_id=complaint_data.sector_id,
            priority_level_id=complaint_data.priority_level_id,
            category_time_window_hours=category_config["time_window_hours"],
            category_base_severity_weight=category_config["base_severity_weight"],
            similarity_threshold=category_config["similarity_threshold"],
            created_at=created_at_dt,
        )

        cluster_result = await use_case.execute(input_dto)
        await db.commit()

        if cluster_result.is_new_incident:
            logger.info(f"Step 6 complete — new incident created: id={cluster_result.incident_id}")
        else:
            logger.info(
                f"Step 6 complete — merged into existing incident: id={cluster_result.incident_id}, "
                f"similarity={cluster_result.similarity_score:.4f}"
            )

        # Recalculate severity for the incident ─────────────────────
        logger.info(f"Step 7 starting — recalculating severity for incident id={cluster_result.incident_id}")
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
        cached_my_complaints = await get_cache(f"user_complaints:{user_id}")
        if cached_my_complaints:
            logger.info(f"My complaints for user {user_id} retrieved from cache")
            return [ComplaintWithUserData.model_validate_json(complaint) for complaint in cached_my_complaints]
        
        result = await db.execute(
            select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.sector), selectinload(Complaint.category), selectinload(Complaint.priority_level)).where(Complaint.user_id == user_id)
        )
        
        complaints = result.scalars().all()
        
        logger.info(f"Fetched complaints for user {user_id}: {complaints}")
        
        user_complaints = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        await set_cache(f"user_complaints:{user_id}", [complaint.model_dump_json() for complaint in user_complaints], expiration=3600)
        return user_complaints
    
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