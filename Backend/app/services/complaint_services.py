import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.schemas.response_schema import ResponseCreateSchema
from app.constants.roles import UserRole
from app.models.user import User
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.models.barangay_account import BarangayAccount
from sqlalchemy import select, update
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData,MyComplaintData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse
from app.utils.caching import set_cache, get_cache, delete_cache
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintInput
from app.domain.repository.incident_repository import IncidentRepository
from app.tasks import cluster_complaint_task, send_notifications_task, notify_user_for_hearing_task, save_response_task
from app.utils.reverse_geocoding import reverse_geocode


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
        
        query = query.order_by(Complaint.created_at.asc())
        
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
            .order_by(Complaint.created_at.asc())
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
    
    
async def user_complaints_statistics(user_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Complaint)
            .where(Complaint.user_id == user_id)
        )
        complaints = result.scalars().all()

        total_complaints = len(complaints)
        resolved_complaints = sum(1 for c in complaints if c.status in [ComplaintStatus.RESOLVED_BY_BARANGAY.value, ComplaintStatus.RESOLVED_BY_DEPARTMENT.value])
        pending_complaints = sum(1 for c in complaints if c.status not in [ComplaintStatus.RESOLVED_BY_BARANGAY.value, ComplaintStatus.RESOLVED_BY_DEPARTMENT.value])

        return {
            "total_complaints": total_complaints,
            "resolved_complaints": resolved_complaints,
            "pending_complaints": pending_complaints
        }

    except Exception as e:
        logger.error(f"Error in user_complaints_statistics: {e}")
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
            "total_resolved": sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED_BY_BARANGAY.value),
            "total_forwarded": sum(1 for c in complaints if c.status == ComplaintStatus.FORWARDED_TO_LGU.value),
            "total_under_review": sum(1 for c in complaints if c.status == ComplaintStatus.REVIEWED_BY_BARANGAY.value),
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
            if complaint.status == ComplaintStatus.RESOLVED_BY_BARANGAY.value:
                stats["daily_counts"][day]["resolved"] += 1
            elif complaint.status in [ComplaintStatus.FORWARDED_TO_LGU.value, ComplaintStatus.FORWARDED_TO_DEPARTMENT.value]:
                stats["daily_counts"][day]["forwarded"] += 1
            elif complaint.status == ComplaintStatus.REVIEWED_BY_BARANGAY.value:
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
        result = await db.execute(select(BarangayAccount).options(selectinload(BarangayAccount.barangay)).where(BarangayAccount.id == complaint_data.barangay_account_id))
        barangay_account = result.scalar_one_or_none()


        if not complaint_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid complaint data")
        
        logger.info(f"Barangay account retrieved: {barangay_account.barangay.barangay_name if barangay_account and barangay_account.barangay else 'None'} for complaint submission")
        
        location = await reverse_geocode(complaint_data.latitude, complaint_data.longitude, barangay_account.barangay.barangay_name if barangay_account and barangay_account.barangay else "")
        if location == {"display_name": "Unknown Location"}:
            logger.warning(f"Reverse geocoding failed for lat: {complaint_data.latitude}, lon: {complaint_data.longitude}. Storing complaint with 'Unknown Location'.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine location from provided coordinates. Please make sure you pin the location accurately on the map.")
        
        
        
        
        new_complaint = Complaint(
            title=complaint_data.title,
            description=complaint_data.description,
            location_details=location,
            latitude=complaint_data.latitude,
            longitude=complaint_data.longitude,
            barangay_id=complaint_data.barangay_id,
            barangay_account_id=complaint_data.barangay_account_id,
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
        logger.info(f"Step 2 complete — category config retrieved for category_id={complaint_data.category_id}")
        logger.info(f"Category Config: {category_config}")

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
            category_radius_km=category_config["category_radius_km"],  # spatial radius
            latitude=complaint_data.latitude,                           # complaint location
            longitude=complaint_data.longitude,                         # complaint location
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
                selectinload(Complaint.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Complaint.incident_links)
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
            now = datetime.utcnow()
            await delete_cache(f"monthly_report_by_barangay:{updated_complaint.barangay_id}:{now.month}:{now.year}")
            
        if updated_complaint.incident_links:
            for link in updated_complaint.incident_links:
                logger.info(f"Clearing caches for linked incident ID: {link.incident_id}")
                await delete_cache(f"incident:{link.incident_id}")
                await delete_cache(f"incident_complaints:{link.incident_id}")
            
        logger.info(f"barangay_account_id: {updated_complaint.barangay_account.id if updated_complaint.barangay_account else None}")
        
        if updated_complaint.barangay_account and updated_complaint.barangay_account.user_id:
            send_notifications_task.delay(
                user_id=updated_complaint.barangay_account.user_id,
                title="New Complaint Submitted",
                message=f"New complaint submitted: {updated_complaint.title}",
                complaint_id=updated_complaint.id,
                notification_type="info"
            )
            logger.info(f"Notification created for barangay account user ID {updated_complaint.barangay_account.user_id} about new complaint ID: {updated_complaint.id}")
            await delete_cache(f"user_notifications:{updated_complaint.barangay_account.user_id}")
            
            
        return ComplaintWithUserData.model_validate(updated_complaint, from_attributes=True)

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error in submit_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def review_complaints_by_incident(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, db: AsyncSession):
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
        result = await db.execute(select(User).where(User.id == responder_id))
        reviewer = result.scalars().first()
        for complaint in complaints:
            if complaint.status in [ComplaintStatus.REVIEWED_BY_BARANGAY.value, ComplaintStatus.REVIEWED_BY_DEPARTMENT.value]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="This incident is already under review"
                )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.REVIEWED_BY_BARANGAY.value if reviewer.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.REVIEWED_BY_DEPARTMENT.value)
        )

        await db.commit()
        
        for complaint_id in complaint_ids:
            save_response_task.delay(
                complaint_id=complaint_id,
                responder_id=responder_id,
                actions_taken=response_data.actions_taken
            )

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None

        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        await delete_cache(f"weekly_forwarded_incidents_stats:{department_account_id}")
        if department_account_id:
            await delete_cache(f"department_incidents:{department_account_id}")
        if barangay_id:
            await delete_cache(f"barangay_incidents:{barangay_id}")
            await delete_cache(f"barangay_{barangay_id}_complaints")
            now = datetime.utcnow()
            await delete_cache(f"monthly_report_by_barangay:{barangay_id}:{now.month}:{now.year}")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title="Complaint Under Review",
                    message=f"Your complaint '{complaint.title}' is now under review",
                    complaint_id=complaint.id,
                    notification_type="update"
                )
                await delete_cache(f"user_notifications:{complaint.user_id}")
                logger.info(f"Notification created for user ID {complaint.user_id} about complaint under review ID: {complaint.id}")
                
        

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident are now under review"}
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def resolve_complaints_by_incident(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()
        result = await db.execute(select(User).where(User.id == responder_id))
        resolver = result.scalars().first()

        if not complaint_ids:
            return {"message": "No complaints found for this incident"}

        complaints = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)))
        complaints = complaints.scalars().all()
        for complaint in complaints:
            if complaint.status in [ComplaintStatus.RESOLVED_BY_BARANGAY.value, ComplaintStatus.RESOLVED_BY_DEPARTMENT.value]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This incident is already resolved"
                )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.RESOLVED_BY_BARANGAY.value if resolver.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.RESOLVED_BY_DEPARTMENT.value, resolved_at=datetime.utcnow())
        )
            
        await db.commit()
        
        for complaint_id in complaint_ids:
            save_response_task.delay(
                complaint_id=complaint_id,
                responder_id=responder_id,
                actions_taken=response_data.actions_taken
            )

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None

        await delete_cache("all_complaints")
        await delete_cache(f"incident:{incident_id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"weekly_complaint_stats_by_barangay:{barangay_id}")
        await delete_cache("all_barangays")
        
        if department_account_id:
            await delete_cache(f"department_incidents:{department_account_id}")
        
        if barangay_id:
            await delete_cache(f"barangay_incidents:{barangay_id}")
            await delete_cache(f"barangay_{barangay_id}_complaints")
            now = datetime.utcnow()
            await delete_cache(f"monthly_report_by_barangay:{barangay_id}:{now.month}:{now.year}")
        
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
            result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
            complaint = result.scalars().first()
            if complaint:
                await delete_cache(f"user_complaints:{complaint.user_id}")
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title="Complaint Resolved",
                    message=f"Your complaint '{complaint.title}' has been resolved",
                    complaint_id=complaint.id,
                    notification_type="success"
                )
                await delete_cache(f"user_notifications:{complaint.user_id}")
                logger.info(f"Notification created for user ID {complaint.user_id} about complaint resolved ID: {complaint.id}")
                

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
            .order_by(Complaint.created_at.asc())
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
    
async def notify_user_for_hearing(incident_id: int, hearing_date: datetime, db: AsyncSession):
    try:
        normalized_hearing_date = (
            hearing_date.replace(tzinfo=None)
            if hearing_date.tzinfo is not None and hearing_date.utcoffset() is not None
            else hearing_date
        )

        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()

        if not complaint_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No complaints found for the specified incident")

        result = await db.execute(select(Complaint).where(Complaint.id.in_(complaint_ids)).options(selectinload(Complaint.user), selectinload(Complaint.barangay)))
        complaints = result.scalars().all()
        
        result = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
        incident = result.scalar()

        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

        if not complaints:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No complaints found for the specified incident")
        
        for complaint in complaints:
            if not complaint:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
            
            user = complaint.user
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this complaint")
            
            complaint.hearing_date = normalized_hearing_date
            incident.hearing_date = normalized_hearing_date

            
            user_name = f"{user.first_name} {user.last_name}".strip() or user.name or "User"
            
            notify_user_for_hearing_task.delay(
                recipient=user.email,
                barangay_name=complaint.barangay.barangay_name if complaint.barangay else "N/A",
                compliant_name=user_name,
                hearing_day=normalized_hearing_date.strftime("%d"),
                hearing_month=normalized_hearing_date.strftime("%B"),
                hearing_year=normalized_hearing_date.strftime("%Y"),
                issued_day=datetime.utcnow().strftime("%d"),
                issued_month=datetime.utcnow().strftime("%B"),
                issued_year=datetime.utcnow().strftime("%Y"),
                notified_day=datetime.utcnow().strftime("%d"),
                notified_month=datetime.utcnow().strftime("%B"),
                notified_year=datetime.utcnow().strftime("%Y"),
                hearing_time=normalized_hearing_date.strftime("%I:%M %p")
            )

        await db.commit()
        await delete_cache(f"incident_complaints:{incident_id}")
        
        await delete_cache(f"user_complaints:{user.id}")
        await delete_cache(f"user_notifications:{user.id}")
        await delete_cache(f"incident_complaints:{incident_id}")
        await delete_cache(f"incident:{incident_id}")
        for complaint_id in complaint_ids:
            await delete_cache(f"complaint:{complaint_id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"User {user_name} has been notified about the hearing scheduled for complaint '{complaint.title}'"
            }
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in notify_user_for_hearing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e))
        