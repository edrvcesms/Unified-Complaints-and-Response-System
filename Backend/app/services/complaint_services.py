import calendar
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.response import Response
from sqlalchemy.orm import selectinload
from app.models.incident_model import IncidentModel
from app.models.category import Category
from app.schemas.response_schema import ResponseCreateSchema
from app.constants.roles import UserRole
from app.models.user import User
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
from app.utils.cache_invalidator import invalidate_cache
from app.utils.caching import set_cache, get_cache, delete_cache
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintInput
from app.domain.repository.incident_repository import IncidentRepository
from app.tasks import cluster_complaint_task, send_notifications_task, notify_user_for_hearing_task, save_response_task
from app.utils.reverse_geocoding import reverse_geocode


def _empty_status_counts():
    return {"submitted": 0, "resolved": 0, "forwarded": 0, "under_review": 0}


def _increment_status(bucket: dict, complaint_status: str):
    """Increment the correct status key for a complaint."""
    bucket["submitted"] += 1  # every complaint counts as submitted in the period
    if complaint_status in (
        ComplaintStatus.RESOLVED_BY_BARANGAY.value,
        ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
    ):
        bucket["resolved"] += 1
    elif complaint_status in (
        ComplaintStatus.FORWARDED_TO_LGU.value,
        ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
    ):
        bucket["forwarded"] += 1
    elif complaint_status in (
        ComplaintStatus.REVIEWED_BY_BARANGAY.value,
        ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
    ):
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
        result = await db.execute(select(Complaint).options(selectinload(Complaint.incident_links).selectinload(IncidentComplaintModel.incident).selectinload(IncidentModel.responses).selectinload(Response.user)).options(selectinload(Complaint.user), selectinload(Complaint.barangay), selectinload(Complaint.category), selectinload(Complaint.attachment)
                ).where(Complaint.id == complaint_id))
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
            selectinload(Complaint.attachment),
            selectinload(Complaint.incident_links)
                .selectinload(IncidentComplaintModel.incident)
                .selectinload(IncidentModel.responses)
                .selectinload(Response.user)
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
            .options(selectinload(Complaint.user), 
                     selectinload(Complaint.incident_links).selectinload(IncidentComplaintModel.incident).selectinload(IncidentModel.responses).selectinload(Response.user),
                     selectinload(Complaint.barangay), selectinload(Complaint.category), selectinload(Complaint.attachment))
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
    
async def get_weekly_stats(barangay_id: int, db: AsyncSession):
    cache_key = f"complaint_stats:weekly:{barangay_id}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    since = datetime.utcnow() - timedelta(days=7)
    complaints = (await db.execute(
        select(Complaint).where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= since,
        )
    )).scalars().all()

    categories = (await db.execute(select(Category))).scalars().all()

    # Build day buckets for the last 7 days
    daily_counts: dict = {}
    daily_by_category: dict = {}
    for i in range(7):
        day = (datetime.utcnow() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        daily_counts[day] = _empty_status_counts()
        daily_by_category[day] = {cat.category_name: 0 for cat in categories}

    for c in complaints:
        day = c.created_at.strftime("%Y-%m-%d")
        if day in daily_counts:
            _increment_status(daily_counts[day], c.status)
        if day in daily_by_category and c.category:
            daily_by_category[day][c.category.category_name] = (
                daily_by_category[day].get(c.category.category_name, 0) + 1
            )

    forwarded_result = await db.execute(
        select(
            func.date(Complaint.forwarded_at).label("date"),
            func.count(Complaint.id).label("count")
        )
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.status.in_(
                [ComplaintStatus.FORWARDED_TO_LGU.value, ComplaintStatus.FORWARDED_TO_DEPARTMENT.value]
            ),
            Complaint.forwarded_at.is_not(None),
            Complaint.forwarded_at >= since,
        )
        .group_by(func.date(Complaint.forwarded_at))
    )

    for day_key in daily_counts:
        daily_counts[day_key]["forwarded"] = 0

    forwarded_total = 0
    for row in forwarded_result.all():
        date_str = row.date.isoformat()
        if date_str in daily_counts:
            daily_counts[date_str]["forwarded"] = row.count
            forwarded_total += row.count

    stats = {
        "period": "weekly",
        "total_submitted": sum(1 for c in complaints if c.status == ComplaintStatus.SUBMITTED.value),
        "total_resolved": sum(1 for c in complaints if c.status in (
            ComplaintStatus.RESOLVED_BY_BARANGAY.value,
            ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
        )),
        "total_forwarded": forwarded_total,
        "total_under_review": sum(1 for c in complaints if c.status in (
            ComplaintStatus.REVIEWED_BY_BARANGAY.value,
            ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
        )),
        "total_by_category": _build_category_map(complaints, categories),
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
    start = datetime(year, month, 1)
    end = datetime(year, month, days_in_month, 23, 59, 59)

    complaints = (await db.execute(
        select(Complaint).where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= start,
            Complaint.created_at <= end,
        )
    )).scalars().all()

    categories = (await db.execute(select(Category))).scalars().all()

    # Build day buckets for every day in the month
    daily_counts: dict = {}
    daily_by_category: dict = {}
    for d in range(1, days_in_month + 1):
        day = f"{year}-{month:02d}-{d:02d}"
        daily_counts[day] = _empty_status_counts()
        daily_by_category[day] = {cat.category_name: 0 for cat in categories}

    for c in complaints:
        day = c.created_at.strftime("%Y-%m-%d")
        if day in daily_counts:
            _increment_status(daily_counts[day], c.status)
        if day in daily_by_category and c.category:
            daily_by_category[day][c.category.category_name] = (
                daily_by_category[day].get(c.category.category_name, 0) + 1
            )

    forwarded_result = await db.execute(
        select(
            func.date(Complaint.forwarded_at).label("date"),
            func.count(Complaint.id).label("count")
        )
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.status.in_(
                [ComplaintStatus.FORWARDED_TO_LGU.value, ComplaintStatus.FORWARDED_TO_DEPARTMENT.value]
            ),
            Complaint.forwarded_at.is_not(None),
            Complaint.forwarded_at >= start,
            Complaint.forwarded_at <= end,
        )
        .group_by(func.date(Complaint.forwarded_at))
    )

    for day_key in daily_counts:
        daily_counts[day_key]["forwarded"] = 0

    forwarded_total = 0
    for row in forwarded_result.all():
        date_str = row.date.isoformat()
        if date_str in daily_counts:
            daily_counts[date_str]["forwarded"] = row.count
            forwarded_total += row.count

    stats = {
        "period": "monthly",
        "year": year,
        "month": month,
        "total_submitted": sum(1 for c in complaints if c.status == ComplaintStatus.SUBMITTED.value),
        "total_resolved": sum(1 for c in complaints if c.status in (
            ComplaintStatus.RESOLVED_BY_BARANGAY.value,
            ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
        )),
        "total_forwarded": forwarded_total,
        "total_under_review": sum(1 for c in complaints if c.status in (
            ComplaintStatus.REVIEWED_BY_BARANGAY.value,
            ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
        )),
        "total_by_category": _build_category_map(complaints, categories),
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

    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31, 23, 59, 59)

    complaints = (await db.execute(
        select(Complaint).where(
            Complaint.barangay_id == barangay_id,
            Complaint.created_at >= start,
            Complaint.created_at <= end,
        )
    )).scalars().all()

    categories = (await db.execute(select(Category))).scalars().all()

    MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Build month buckets
    monthly_counts: dict = {}
    monthly_by_category: dict = {}
    for m in range(1, 13):
        key = MONTH_LABELS[m - 1]
        monthly_counts[key] = _empty_status_counts()
        monthly_by_category[key] = {cat.category_name: 0 for cat in categories}

    for c in complaints:
        key = MONTH_LABELS[c.created_at.month - 1]
        _increment_status(monthly_counts[key], c.status)
        if c.category:
            monthly_by_category[key][c.category.category_name] = (
                monthly_by_category[key].get(c.category.category_name, 0) + 1
            )

    forwarded_rows = (await db.execute(
        select(Complaint.forwarded_at)
        .where(
            Complaint.barangay_id == barangay_id,
            Complaint.status.in_(
                [ComplaintStatus.FORWARDED_TO_LGU.value, ComplaintStatus.FORWARDED_TO_DEPARTMENT.value]
            ),
            Complaint.forwarded_at.is_not(None),
            Complaint.forwarded_at >= start,
            Complaint.forwarded_at <= end,
        )
    )).scalars().all()

    for month_key in monthly_counts:
        monthly_counts[month_key]["forwarded"] = 0

    forwarded_total = 0
    for forwarded_at in forwarded_rows:
        key = MONTH_LABELS[forwarded_at.month - 1]
        monthly_counts[key]["forwarded"] += 1
        forwarded_total += 1

    stats = {
        "period": "yearly",
        "year": year,
        "total_submitted": sum(1 for c in complaints if c.status == ComplaintStatus.SUBMITTED.value),
        "total_resolved": sum(1 for c in complaints if c.status in (
            ComplaintStatus.RESOLVED_BY_BARANGAY.value,
            ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
        )),
        "total_forwarded": forwarded_total,
        "total_under_review": sum(1 for c in complaints if c.status in (
            ComplaintStatus.REVIEWED_BY_BARANGAY.value,
            ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
        )),
        "total_by_category": _build_category_map(complaints, categories),
        "monthly_counts": monthly_counts,
        "monthly_by_category": monthly_by_category,
    }

    await set_cache(cache_key, stats, expiration=3600)
    return stats


async def submit_complaint(complaint_data: ComplaintCreateData, user_id: int, db: AsyncSession):

    try:
        result = await db.execute(select(BarangayAccount).options(selectinload(BarangayAccount.barangay)).where(BarangayAccount.id == complaint_data.barangay_account_id))
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
            
        await invalidate_cache(
            complaint_ids=[updated_complaint.id],
            user_ids=[user_id],
            barangay_id=updated_complaint.barangay_id,
            incident_ids=[link.incident_id for link in updated_complaint.incident_links] if updated_complaint.incident_links else None,
            include_global=True
        )
            
        return ComplaintWithUserData.model_validate(updated_complaint, from_attributes=True)

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error in submit_complaint: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def get_geometric_location_details(latitude: float, longitude: float, barangay_name: str):
    try:
        location = await reverse_geocode(latitude, longitude, barangay_name)
        return location
    except Exception as e:
        logger.error(f"Error in get_geometric_location_details: {e}")
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
                selectinload(Complaint.incident_links).selectinload(IncidentComplaintModel.incident)
                .selectinload(IncidentModel.responses).selectinload(Response.user)
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
            
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in complaints],
            barangay_id=complaint.barangay_id if complaint.barangay_id else None,
            incident_ids=[incident_id],
            include_global=False
        )
        
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
        