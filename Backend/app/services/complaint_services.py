import calendar
from typing import List
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.response import Response
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.models.category import Category
from app.models.complaint_logs import ComplaintLogs
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.models.barangay_account import BarangayAccount
from sqlalchemy import select, update, func
from app.schemas.complaint_schema import ComplaintCreateData, ComplaintWithUserData,MyComplaintData
from datetime import datetime
from app.utils.logger import logger
from app.constants.complaint_status import ComplaintStatus
from fastapi.responses import JSONResponse
from app.utils.caching import set_cache, get_cache
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintInput
from app.domain.repository.incident_repository import IncidentRepository
from app.tasks.incident_tasks import cluster_complaint_task
from app.tasks.notification_tasks import send_notifications_task
from app.tasks.email_tasks import notify_user_for_hearing_task
from app.utils.reverse_geocoding import reverse_geocode
from app.utils.query_optimization import QueryOptions, BatchLoader, StatisticsHelper
from app.utils.cache_invalidator_optimized import CacheInvalidator


def _empty_status_counts():
    return {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}


def _increment_status(bucket: dict, complaint_status: str):
    """Increment the correct status key for a complaint."""
    if complaint_status == ComplaintStatus.SUBMITTED.value:
        bucket["submitted"] += 1
    elif complaint_status == ComplaintStatus.RESOLVED_BY_BARANGAY.value:
        bucket["resolved"] += 1
    elif complaint_status == ComplaintStatus.FORWARDED_TO_LGU.value:
        bucket["forwarded"] += 1
    elif complaint_status == ComplaintStatus.REVIEWED_BY_BARANGAY.value:
        bucket["under_review"] += 1


def _build_category_map(complaints, categories):
    """Returns { category_name: count } for the given complaint list."""
    return {
        cat.category_name: sum(1 for c in complaints if c.category_id == cat.id)
        for cat in categories
    }


async def get_complaint_by_id(complaint_id: int, db: AsyncSession):
    try:
        complaint_cache = await get_cache(f"complaint:{complaint_id}")
        if complaint_cache is not None:
            logger.info(f"Cache hit for complaint ID: {complaint_id}")
            return ComplaintWithUserData.model_validate_json(complaint_cache) if isinstance(complaint_cache, str) else ComplaintWithUserData.model_validate(complaint_cache, from_attributes=True)
        
        result = await db.execute(
            select(Complaint)
            .options(*QueryOptions.complaint_full())
            .where(Complaint.id == complaint_id)
        )
        complaint = result.scalars().first()

        if not complaint:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
        
        logger.info(f"Fetched complaint with ID {complaint_id}")
        complaint_data = ComplaintWithUserData.model_validate(complaint, from_attributes=True)
        await set_cache(f"complaint:{complaint_id}", complaint_data.model_dump_json(), expiration=3600)
        return complaint_data
    
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Error in get_complaint_by_id: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_all_complaints(db: AsyncSession, barangay_id: int = None):
    try:
        cache_key = f"barangay_{barangay_id}_complaints" if barangay_id else "all_complaints"
        complaints_cache = await get_cache(cache_key)
        if complaints_cache is not None:
            logger.info(f"Cache hit for complaints (barangay_id: {barangay_id or 'all'})")
            return [ComplaintWithUserData.model_validate_json(c) if isinstance(c, str) else ComplaintWithUserData.model_validate(c, from_attributes=True) for c in complaints_cache]
        
        query = select(Complaint).options(*QueryOptions.complaint_full())
        
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
        logger.exception(f"Error in get_all_complaints: {e}")
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
            .options(*QueryOptions.complaint_full())
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
        logger.exception(f"Error in get_complaints_by_incident: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.exception(f"Error in get_complaints_by_incident: {e}")
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
        logger.exception(f"Error in user_complaints_statistics: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_weekly_stats(barangay_id: int, db: AsyncSession):
    cache_key = f"complaint_stats:weekly:{barangay_id}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    since = datetime.now(timezone.utc) - timedelta(days=7)
    until = datetime.now(timezone.utc)

    # Get status counts from database aggregation
    status_totals, date_status_rows = await StatisticsHelper.get_status_counts_by_date_range(
        db, barangay_id, since, until
    )
    
    # Get category counts from database aggregation
    total_by_category = await StatisticsHelper.get_category_counts(
        db, barangay_id, since, until
    )

    # Initialize daily counts
    daily_counts: dict = {}
    daily_by_category: dict = {}
    for i in range(7):
        day = (datetime.now(timezone.utc) - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        daily_counts[day] = {
            "submitted": 0,
            "resolved": 0,
            "forwarded": 0,
            "under_review": 0
        }
        daily_by_category[day] = {cat: 0 for cat in total_by_category.keys()}

    # Get daily breakdown for categories (still need to load minimal data)
    complaints = (await db.execute(
        select(Complaint)
        .options(*QueryOptions.complaint_for_stats())
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= since
        )
    )).scalars().all()

    # Populate daily category counts from loaded complaints
    for c in complaints:
        day = c.created_at.strftime("%Y-%m-%d")
        if day in daily_by_category and c.category:
            daily_by_category[day][c.category.category_name] += 1

    # Populate daily status counts
    for date_val, status_val, count in date_status_rows:
        day = date_val.strftime("%Y-%m-%d") if hasattr(date_val, 'strftime') else str(date_val)
        if day in daily_counts:
            if status_val == 'submitted':
                daily_counts[day]['submitted'] = count
            elif status_val in ['resolved_by_barangay', 'resolved_by_department']:
                daily_counts[day]['resolved'] = count
            elif status_val == 'forwarded_to_lgu':
                daily_counts[day]['forwarded'] = count
            elif status_val == 'reviewed_by_barangay':
                daily_counts[day]['under_review'] = count

    stats = {
        "period": "weekly",
        "total_complaints": len(complaints),
        "total_submitted": status_totals["submitted"],
        "total_resolved": status_totals["resolved"],
        "total_forwarded": status_totals["forwarded"],
        "total_under_review": status_totals["under_review"],
        "total_by_category": total_by_category,
        "daily_counts": daily_counts,
        "daily_by_category": daily_by_category,
    }

    await set_cache(cache_key, stats, expiration=3600)
    return stats

async def get_monthly_stats(barangay_id: int, year: int, month: int, db: AsyncSession):
    cache_key = f"complaint_stats:monthly:{barangay_id}:{year}:{month}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    _, days_in_month = calendar.monthrange(year, month)
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year, month, days_in_month, 23, 59, 59, tzinfo=timezone.utc)

    # Get status counts from database aggregation
    status_totals, date_status_rows = await StatisticsHelper.get_status_counts_by_date_range(
        db, barangay_id, start, end
    )
    
    # Get category counts from database aggregation
    total_by_category = await StatisticsHelper.get_category_counts(
        db, barangay_id, start, end
    )

    # Initialize daily counts
    daily_counts = {}
    daily_by_category = {}
    for d in range(1, days_in_month + 1):
        day = f"{year}-{month:02d}-{d:02d}"
        daily_counts[day] = {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}
        daily_by_category[day] = {cat: 0 for cat in total_by_category.keys()}

    # Get daily breakdown for categories
    complaints = (await db.execute(
        select(Complaint)
        .options(*QueryOptions.complaint_for_stats())
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= start,
            Complaint.created_at <= end
        )
    )).scalars().all()

    # Populate daily category counts
    for c in complaints:
        day = c.created_at.strftime("%Y-%m-%d")
        if day in daily_by_category and c.category:
            daily_by_category[day][c.category.category_name] += 1

    # Populate daily status counts
    for date_val, status_val, count in date_status_rows:
        day = date_val.strftime("%Y-%m-%d") if hasattr(date_val, 'strftime') else str(date_val)
        if day in daily_counts:
            if status_val == 'submitted':
                daily_counts[day]['submitted'] = count
            elif status_val in ['resolved_by_barangay', 'resolved_by_department']:
                daily_counts[day]['resolved'] = count
            elif status_val == 'forwarded_to_lgu':
                daily_counts[day]['forwarded'] = count
            elif status_val == 'reviewed_by_barangay':
                daily_counts[day]['under_review'] = count

    stats = {
        "period": "monthly",
        "year": year,
        "month": month,
        "total_complaints": len(complaints),
        "total_submitted": status_totals["submitted"],
        "total_resolved": status_totals["resolved"],
        "total_forwarded": status_totals["forwarded"],
        "total_under_review": status_totals["under_review"],
        "total_by_category": total_by_category,
        "daily_counts": daily_counts,
        "daily_by_category": daily_by_category,
    }

    await set_cache(cache_key, stats, expiration=3600)
    return stats

async def get_yearly_stats(barangay_id: int, year: int, db: AsyncSession):
    cache_key = f"complaint_stats:yearly:{barangay_id}:{year}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

    # Get status counts from database aggregation
    status_totals, date_status_rows = await StatisticsHelper.get_status_counts_by_date_range(
        db, barangay_id, start, end
    )
    
    # Get category counts from database aggregation
    total_by_category = await StatisticsHelper.get_category_counts(
        db, barangay_id, start, end
    )

    MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly_counts = {
        m: {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}
        for m in MONTHS
    }
    monthly_by_category = {
        m: {cat: 0 for cat in total_by_category.keys()}
        for m in MONTHS
    }

    # Get monthly breakdown for categories
    complaints = (await db.execute(
        select(Complaint)
        .options(*QueryOptions.complaint_for_stats())
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= start,
            Complaint.created_at <= end
        )
    )).scalars().all()

    # Populate monthly category counts
    for c in complaints:
        label = MONTHS[c.created_at.month - 1]
        if c.category:
            monthly_by_category[label][c.category.category_name] += 1

    # Populate monthly status counts
    for date_val, status_val, count in date_status_rows:
        month_idx = date_val.month - 1 if hasattr(date_val, 'month') else int(str(date_val).split('-')[1]) - 1
        label = MONTHS[month_idx]
        if status_val == 'submitted':
            monthly_counts[label]['submitted'] += count
        elif status_val in ['resolved_by_barangay', 'resolved_by_department']:
            monthly_counts[label]['resolved'] += count
        elif status_val == 'forwarded_to_lgu':
            monthly_counts[label]['forwarded'] += count
        elif status_val == 'reviewed_by_barangay':
            monthly_counts[label]['under_review'] += count

    stats = {
        "period": "yearly",
        "year": year,
        "total_complaints": len(complaints),
        "total_submitted": status_totals["submitted"],
        "total_resolved": status_totals["resolved"],
        "total_forwarded": status_totals["forwarded"],
        "total_under_review": status_totals["under_review"],
        "total_by_category": total_by_category,
        "monthly_counts": monthly_counts,
        "monthly_by_category": monthly_by_category,
    }

    await set_cache(cache_key, stats, expiration=3600)
    return stats


async def submit_complaint(complaint_data: ComplaintCreateData, user_id: int, db: AsyncSession):

    try:
        resolved_barangay_account_id = complaint_data.barangay_account_id
        if not resolved_barangay_account_id:
            fallback_account_result = await db.execute(
                select(BarangayAccount.id).where(BarangayAccount.barangay_id == complaint_data.barangay_id)
            )
            resolved_barangay_account_id = fallback_account_result.scalar_one_or_none()

        result = await db.execute(select(BarangayAccount).options(selectinload(BarangayAccount.barangay)).where(BarangayAccount.id == resolved_barangay_account_id))
        barangay_account = result.scalar_one_or_none()


        if not complaint_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid complaint data")
        
        logger.info(f"Barangay account retrieved: {barangay_account.barangay.barangay_name if barangay_account and barangay_account.barangay else 'None'} for complaint submission")
        
        location = await reverse_geocode(complaint_data.latitude, complaint_data.longitude, barangay_account.barangay.barangay_name if barangay_account and barangay_account.barangay else "")
        location_details = location.get("display_name") if isinstance(location, dict) else location
        if location_details == "Unknown Location":
            logger.warning(f"Reverse geocoding failed for lat: {complaint_data.latitude}, lon: {complaint_data.longitude}. Storing complaint with 'Unknown Location'.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine location from provided coordinates. Please make sure you pin the location accurately on the map.")
        
        new_complaint = Complaint(
            title=complaint_data.title,
            description=complaint_data.description,
            location_details=location_details,
            latitude=complaint_data.latitude,
            longitude=complaint_data.longitude,
            barangay_id=complaint_data.barangay_id,
            barangay_account_id=resolved_barangay_account_id,
            category_id=complaint_data.category_id,
            status=ComplaintStatus.SUBMITTED.value,
            user_id=user_id,
            created_at=datetime.now(timezone.utc)
        )

        db.add(new_complaint)
        await db.flush()

        await log_status_change(
            complaint_ids=[new_complaint.id],
            new_status=ComplaintStatus.SUBMITTED.value,
            changed_by_user_id=user_id,
            db=db
        )

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
            created_at=datetime.now(timezone.utc),
        )
        
        cluster_data = ClusterComplaintSchema.model_validate(input_dto.__dict__)
        
        cluster = cluster_complaint_task.delay(complaint_data=cluster_data.model_dump())

        result = await db.execute(
            select(Complaint)
            .options(*QueryOptions.complaint_full())
            .where(Complaint.id == new_complaint.id)
        )
        updated_complaint = result.scalars().first()

        logger.info(f"All steps complete — complaint id={new_complaint.id} fully processed")
            
        logger.info(f"barangay_account_id: {updated_complaint.barangay_account.id if updated_complaint.barangay_account else None}")
        
        if updated_complaint.barangay_account and updated_complaint.barangay_account.user_id:
            send_notifications_task.delay(
                user_id=updated_complaint.barangay_account.user_id,
                title="New Complaint Submitted",
                message=f"New complaint has been submitted: {updated_complaint.title}",
                complaint_id=updated_complaint.id,
                incident_id=cluster.result().incident_id if cluster else None,
                notification_type="info",
                event="new_complaint"
            )
            logger.info(f"Notification created for barangay account user ID {updated_complaint.barangay_account.user_id} about new complaint ID: {updated_complaint.id}")
            
        await CacheInvalidator.invalidate_cache(
            complaint_ids=[updated_complaint.id],
            user_ids=[user_id],
            barangay_id=updated_complaint.barangay_id,
            incident_ids=[link.incident_id for link in updated_complaint.incident_links] if updated_complaint.incident_links else [],
            include_global=True
        )
            
        return ComplaintWithUserData.model_validate(updated_complaint, from_attributes=True)

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in submit_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_geometric_location_details(latitude: float, longitude: float, barangay_name: str):
    try:
        location = await reverse_geocode(latitude, longitude, barangay_name)
        return location
    except Exception as e:
        logger.exception(f"Error in get_geometric_location_details: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
 
async def get_my_complaints(user_id: int, db: AsyncSession):
    try:
        cached = await get_cache(f"user_complaints:{user_id}")
        if cached:
            logger.info(f"My complaints for user {user_id} retrieved from cache")
            return [MyComplaintData.model_validate_json(c) for c in cached]

        result = await db.execute(
            select(Complaint)
            .options(*QueryOptions.complaint_full())
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
        logger.exception(f"Error in get_my_complaints: {e}")
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

        # OPTIMIZED: Batch fetch all complaints at once instead of in loop
        complaints_dict = await BatchLoader.fetch_complaints_by_ids(db, complaint_ids, minimal=False)
        complaints = list(complaints_dict.values())
        
        result = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
        incident = result.scalar()

        if not incident:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

        if not complaints:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No complaints found for the specified incident")
        
        # Update all complaints and incident with hearing date
        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(hearing_date=normalized_hearing_date)
        )
        await db.execute(
            update(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .values(hearing_date=normalized_hearing_date)
        )
        await db.commit()
        
        # Send notifications using cached complaints
        for complaint in complaints:
            if not complaint:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
            
            user = complaint.user
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this complaint")
            
            user_name = f"{user.first_name} {user.last_name}".strip() or user.name or "User"
            
            notify_user_for_hearing_task.delay(
                recipient=user.email,
                barangay_name=complaint.barangay.barangay_name if complaint.barangay else "N/A",
                compliant_name=user_name,
                hearing_day=normalized_hearing_date.strftime("%d"),
                hearing_month=normalized_hearing_date.strftime("%B"),
                hearing_year=normalized_hearing_date.strftime("%Y"),
                issued_day=datetime.now(timezone.utc).strftime("%d"),
                issued_month=datetime.now(timezone.utc).strftime("%B"),
                issued_year=datetime.now(timezone.utc).strftime("%Y"),
                notified_day=datetime.now(timezone.utc).strftime("%d"),
                notified_month=datetime.now(timezone.utc).strftime("%B"),
                notified_year=datetime.now(timezone.utc).strftime("%Y"),
                hearing_time=normalized_hearing_date.strftime("%I:%M %p")
            )
        
        # Get complaint barangay_id from first complaint for cache invalidation
        first_complaint = complaints[0] if complaints else None
        complaint_barangay_id = first_complaint.barangay_id if first_complaint else None
            
        await CacheInvalidator.invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=await BatchLoader.fetch_user_ids_for_complaints(db, complaint_ids),
            barangay_id=complaint_barangay_id,
            incident_ids=[incident_id],
            include_global=False
        )
        
        user_name = f"{first_complaint.user.first_name} {first_complaint.user.last_name}".strip() if first_complaint and first_complaint.user else "User"
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"User {user_name} has been notified about the hearing scheduled for complaint '{first_complaint.title if first_complaint else ''}'"
            }
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        logger.exception(f"Error in notify_user_for_hearing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e))
        
        
async def log_status_change(complaint_ids: List[int], new_status: str, changed_by_user_id: int, db: AsyncSession):
    try:
        now = datetime.now(timezone.utc)
        logs = [
            ComplaintLogs(
                complaint_id=complaint_id,
                new_status=new_status,
                updated_by=changed_by_user_id,
                timestamp=now
            )
            for complaint_id in complaint_ids
        ]
        db.add_all(logs)
        await db.commit()
        logger.info(f"Logged status change to '{new_status}' for complaints: {complaint_ids} by user ID: {changed_by_user_id}")
        
        
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        logger.exception(f"Error in log_status_change: {e}")