import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from sqlalchemy import select, update
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData,MyComplaintData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse
from app.utils.caching import set_cache, get_cache, delete_cache
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintInput
from app.domain.repository.incident_repository import IncidentRepository
from app.tasks import cluster_complaint_task


async def get_complaint_by_id(complaint_id: int, db: AsyncSession):
    try:
        complaint_cache = await get_cache(f"complaint:{complaint_id}")
        if complaint_cache is not None:
            logger.info(f"Cache hit for complaint ID: {complaint_id}")
            return ComplaintWithUserData.model_validate_json(complaint_cache) if isinstance(complaint_cache, str) else ComplaintWithUserData.model_validate(complaint_cache, from_attributes=True)
        result = await db.execute(select(Complaint).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.category), selectinload(Complaint.attachment)).where(Complaint.id == complaint_id))
        complaint = result.scalars().first()
        
        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        logger.info(f"Fetched complaint with ID {complaint_id}")
        complaint = ComplaintWithUserData.model_validate(complaint, from_attributes=True)
        await set_cache(f"complaint:{complaint_id}", complaint.model_dump_json(), expiration=3600)
        return complaint
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_complaint_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_all_complaints(db: AsyncSession, barangay_id: int = None):
    try:
        cache_key = f"barangay_{barangay_id}_complaints" if barangay_id else "all_complaints"
        complaints_cache = await get_cache(cache_key)
        if complaints_cache is not None:
            logger.info(f"Cache hit for complaints (barangay_id: {barangay_id or 'all'})")
            return [ComplaintWithUserData.model_validate_json(c) if isinstance(c, str) else ComplaintWithUserData.model_validate(c, from_attributes=True) for c in complaints_cache]
        
        query = select(Complaint).options(
            selectinload(Complaint.user), 
            selectinload(Complaint.barangay), 
            selectinload(Complaint.category), 
            selectinload(Complaint.attachment)
        )
        
        if barangay_id is not None:
            query = query.where(Complaint.barangay_id == barangay_id)
        
        result = await db.execute(query)
        complaints = result.scalars().all()
        
        logger.info(f"Fetched complaints: {len(complaints)} complaints found (barangay_id: {barangay_id or 'all'})")
        
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        
        await set_cache(cache_key, [c.model_dump_json() for c in complaints_list], expiration=3600)
        return complaints_list
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_all_complaints: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_complaints_by_incident(incident_id: int, db: AsyncSession):
    try:
        complaints_cache = await get_cache(f"incident_complaints:{incident_id}")
        if complaints_cache is not None:
            logger.info(f"Cache hit for complaints of incident ID: {incident_id}")
            return [ComplaintWithUserData.model_validate_json(c) if isinstance(c, str) else ComplaintWithUserData.model_validate(c, from_attributes=True) for c in complaints_cache]
        result = await db.execute(
            select(Complaint)
            .join(IncidentComplaintModel, Complaint.id == IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
            .options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.category), selectinload(Complaint.attachment))
        )
        complaints = result.scalars().all()
        
        logger.info(f"Fetched complaints for incident ID {incident_id}: {len(complaints)} complaints found")
        complaints_list = [ComplaintWithUserData.model_validate(complaint, from_attributes=True) for complaint in complaints]
        await set_cache(f"incident_complaints:{incident_id}", [c.model_dump_json() for c in complaints_list], expiration=3600)
        return complaints_list
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in get_complaints_by_incident: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_weekly_complaint_stats_by_barangay(barangay_id: int, db: AsyncSession):
    try:
        weekly_stats_cache = await get_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        if weekly_stats_cache is not None:
            logger.info("Cache hit for weekly complaint stats by barangay")
            return weekly_stats_cache
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        result = await db.execute(
            select(Complaint)
            .where(Complaint.barangay_id == barangay_id, Complaint.created_at >= one_week_ago)
        )
        complaints = result.scalars().all()
        
        stats = {
            "total_submitted": sum(1 for c in complaints if c.status == ComplaintStatus.SUBMITTED.value),
            "total_resolved": sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED.value),
            "total_forwarded": sum(1 for c in complaints if c.status == ComplaintStatus.FORWARDED_TO_LGU.value),
            "total_under_review": sum(1 for c in complaints if c.status == ComplaintStatus.UNDER_REVIEW.value),
            "daily_counts": {}
        }
        
        stats["daily_counts"] = {}
        for i in range(7):
            day = (datetime.utcnow() - timedelta(days=6-i)).strftime("%Y-%m-%d")
            stats["daily_counts"][day] = {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}
            
        for complaint in complaints:
            day = complaint.created_at.strftime("%Y-%m-%d")
            if day not in stats["daily_counts"]:
                stats["daily_counts"][day] = {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}
            stats["daily_counts"][day]["submitted"] += 1
            if complaint.status == ComplaintStatus.RESOLVED.value:
                stats["daily_counts"][day]["resolved"] += 1
            elif complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value:
                stats["daily_counts"][day]["forwarded"] += 1
            elif complaint.status == ComplaintStatus.UNDER_REVIEW.value:
                stats["daily_counts"][day]["under_review"] += 1
        
        await set_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}", stats, expiration=3600)
        return stats
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in get_weekly_complaint_stats_by_barangay: {e}")
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

        incident_repo = IncidentRepository(db)
        category_config = await incident_repo.get_category_config(complaint_data.category_id)
        

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
        
        cluster_data = ClusterComplaintSchema.model_validate(input_dto.__dict__)
        
        cluster_complaint_task.delay(complaint_data=cluster_data.model_dump())

        result = await db.execute(
            select(Complaint)
            .options(
                selectinload(Complaint.user),
                selectinload(Complaint.barangay),
                selectinload(Complaint.category),
                selectinload(Complaint.attachment),
            )
            .where(Complaint.id == new_complaint.id)
        )
        updated_complaint = result.scalars().first()

        logger.info(f"All steps complete — complaint id={new_complaint.id} fully processed")
        
        await delete_cache(f"user_complaints:{user_id}")
        await delete_cache("all_complaints")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{updated_complaint.barangay_id}")
        
        if updated_complaint.barangay_id:
            await delete_cache(f"barangay_incidents:{updated_complaint.barangay_id}")
            await delete_cache(f"barangay_{updated_complaint.barangay_id}_complaints")
            
        return ComplaintWithUserData.model_validate(updated_complaint, from_attributes=True)

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error in submit_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    
async def review_complaints_by_incident(incident_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()
        
        if not complaint_ids:
            return {"message": "No complaints found for this incident"}

        complaints = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)))
        complaints = complaints.scalars().all()
        for complaint in complaints:
            if complaint.status == ComplaintStatus.UNDER_REVIEW:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="This incident is already under review"
                )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.UNDER_REVIEW.value)
        )

        await db.commit()

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None

        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        if department_account_id:
            await delete_cache(f"department_incidents:{department_account_id}")
        if barangay_id:
            await delete_cache(f"barangay_incidents:{barangay_id}")
            await delete_cache(f"barangay_{barangay_id}_complaints")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident are now under review"}
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def resolve_complaints_by_incident(incident_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()

        if not complaint_ids:
            return {"message": "No complaints found for this incident"}

        complaints = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)))
        complaints = complaints.scalars().all()
        for complaint in complaints:
            if complaint.status == ComplaintStatus.RESOLVED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This incident is already resolved"
                )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.RESOLVED.value, resolved_at=datetime.utcnow())
        )

        await db.commit()

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None

        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        
        if department_account_id:
            await delete_cache(f"department_incidents:{department_account_id}")
        
        if barangay_id:
            await delete_cache(f"barangay_incidents:{barangay_id}")
            await delete_cache(f"barangay_{barangay_id}_complaints")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been resolved"}
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
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
    