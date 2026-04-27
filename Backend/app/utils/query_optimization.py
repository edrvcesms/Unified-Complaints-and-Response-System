"""Query Optimization Utilities

Provides optimized selectinload chains and pagination helpers
to prevent N+1 queries and ensure efficient data loading.
"""

from collections import Counter
from typing import Any, List, Tuple
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, select, cast, Date, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.models.complaint import Complaint
from app.models.response import Response
from app.models.user import User
from app.models.barangay import Barangay
from app.models.category import Category
from app.models.attachment import Attachment


class QueryOptions:
    """Pre-built SQLAlchemy selectinload/joinedload option chains."""

    # Incident minimal loading (for list views)
    @staticmethod
    def incident_minimal():
        """Minimal incident data: category, barangay only."""
        return (
            selectinload(IncidentModel.category),
            selectinload(IncidentModel.barangay),
        )

    # Incident with responses (for detail views showing officer responses)
    @staticmethod
    def incident_with_responses():
        """Incident with responses and responder info."""
        return (
            selectinload(IncidentModel.category),
            selectinload(IncidentModel.barangay),
            selectinload(IncidentModel.responses).selectinload(Response.user),
            selectinload(IncidentModel.responses).selectinload(Response.response_attachments),
        )

    # Incident full (for complete details with all complaints)
    @staticmethod
    def incident_full():
        """Complete incident data including all complaint relationships."""
        return (
            selectinload(IncidentModel.category),
            selectinload(IncidentModel.barangay),
            selectinload(IncidentModel.responses).selectinload(Response.user),
            selectinload(IncidentModel.responses).selectinload(Response.response_attachments),
            selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.user),
            selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.attachment),
            selectinload(IncidentModel.complaint_clusters)
                .selectinload(IncidentComplaintModel.complaint)
                .selectinload(Complaint.incident_links),
        )

    # Complaint minimal (for list views)
    @staticmethod
    def complaint_minimal():
        """Minimal complaint data: user, barangay, category."""
        return (
            selectinload(Complaint.user),
            selectinload(Complaint.barangay),
            selectinload(Complaint.category),
        )

    # Complaint with attachments (for detail views)
    @staticmethod
    def complaint_full():
        """Complete complaint with all relationships."""
        from app.models.barangay_account import BarangayAccount

        return (
            selectinload(Complaint.user),
            selectinload(Complaint.barangay),
            selectinload(Complaint.category),
            selectinload(Complaint.attachment),
            selectinload(Complaint.barangay_account).selectinload(BarangayAccount.user),
            selectinload(Complaint.incident_links)
                .selectinload(IncidentComplaintModel.incident)
                .selectinload(IncidentModel.responses)
                .selectinload(Response.user),
            selectinload(Complaint.incident_links)
                .selectinload(IncidentComplaintModel.incident)
                .selectinload(IncidentModel.responses)
                .selectinload(Response.response_attachments),
        )

    # Complaint for statistics (only load category for grouping)
    @staticmethod
    def complaint_for_stats():
        """Minimal complaint data for statistics: only category needed."""
        return (
            selectinload(Complaint.category),
        )

    # User with related accounts
    @staticmethod
    def user_with_accounts():
        """User with barangay and department accounts."""
        from app.models.barangay_account import BarangayAccount
        from app.models.department_account import DepartmentAccount
        
        return (
            selectinload(User.barangay_account).selectinload(BarangayAccount.barangay),
            selectinload(User.department_account).selectinload(DepartmentAccount.department),
        )


class PaginationParams:
    """Pagination helper to prevent loading all records."""

    def __init__(self, page: int = 1, page_size: int = 10):
        """Initialize pagination parameters.
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page
        """
        self.page = max(1, page)
        self.page_size = max(1, min(page_size, 100))  # Cap at 100
        self.offset = (self.page - 1) * self.page_size

    def apply_to_query(self, query):
        """Apply LIMIT and OFFSET to query."""
        return query.limit(self.page_size).offset(self.offset)

    async def get_total_count(self, db: AsyncSession, count_query) -> int:
        """Get total count for pagination metadata."""
        result = await db.execute(select(func.count()).select_from(count_query))
        return result.scalar() or 0

    def get_metadata(self, total: int) -> dict:
        """Get pagination metadata."""
        total_pages = (total + self.page_size - 1) // self.page_size
        return {
            "page": self.page,
            "page_size": self.page_size,
            "total": total,
            "total_pages": max(1, total_pages),
            "offset": self.offset,
        }


class BatchLoader:
    """Batch load related objects to avoid N+1 queries."""

    @staticmethod
    async def fetch_complaints_by_ids(
        db: AsyncSession,
        complaint_ids: List[int],
        minimal: bool = False
    ) -> dict:
        """Fetch multiple complaints in one query.
        
        Returns dict keyed by complaint_id for efficient lookup.
        Prevents N+1 when iterating complaint_ids.
        """
        if not complaint_ids:
            return {}

        options = (
            QueryOptions.complaint_minimal() if minimal
            else QueryOptions.complaint_full()
        )

        result = await db.execute(
            select(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .options(*options)
        )
        
        complaints = result.scalars().all()
        return {c.id: c for c in complaints}

    @staticmethod
    async def fetch_users_by_ids(
        db: AsyncSession,
        user_ids: List[int],
    ) -> dict:
        """Fetch multiple users in one query."""
        if not user_ids:
            return {}

        result = await db.execute(
            select(User)
            .where(User.id.in_(user_ids))
            .options(*QueryOptions.user_with_accounts())
        )
        
        users = result.scalars().all()
        return {u.id: u for u in users}

    @staticmethod
    async def fetch_incidents_by_ids(
        db: AsyncSession,
        incident_ids: List[int],
        minimal: bool = False
    ) -> dict:
        """Fetch multiple incidents in one query."""
        if not incident_ids:
            return {}

        options = (
            QueryOptions.incident_minimal() if minimal
            else QueryOptions.incident_full()
        )

        result = await db.execute(
            select(IncidentModel)
            .where(IncidentModel.id.in_(incident_ids))
            .options(*options)
        )
        
        incidents = result.scalars().all()
        return {i.id: i for i in incidents}

    @staticmethod
    async def fetch_user_ids_for_complaints(
        db: AsyncSession,
        complaint_ids: List[int]
    ) -> List[int]:
        """Get all user_ids for complaints without loading full complaint objects."""
        if not complaint_ids:
            return []

        result = await db.execute(
            select(Complaint.user_id).where(Complaint.id.in_(complaint_ids))
        )
        
        return result.scalars().all()

    @staticmethod
    async def fetch_categories_by_ids(
        db: AsyncSession,
        category_ids: List[int]
    ) -> dict:
        """Fetch multiple categories in one query."""
        if not category_ids:
            return {}

        result = await db.execute(
            select(Category).where(Category.id.in_(category_ids))
        )
        
        categories = result.scalars().all()
        return {c.id: c for c in categories}
    
class AccountSuspensionHelper:
    """Helper for managing account suspensions."""

    @staticmethod
    async def suspend_user_account(db: AsyncSession, user_id: int) -> None:
        """Suspend a user account."""
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(is_suspended=True)
        )
        await db.commit()

    @staticmethod
    async def suspend_user_accounts(db: AsyncSession, user_ids: List[int]) -> None:
        """Suspend multiple user accounts in one query."""
        if not user_ids:
            return

        await db.execute(
            update(User)
            .where(User.id.in_(user_ids))
            .values(is_suspended=True)
        )
        await db.commit()

class RestrictSubmissionHelper:
    """Helper for managing complaint submission restrictions."""

    _APP_TZ = ZoneInfo("Asia/Manila")

    @staticmethod
    def now_local_naive() -> datetime:
        # Keep restriction values as local wall-clock timestamps (without tz offset).
        return datetime.now(RestrictSubmissionHelper._APP_TZ).replace(tzinfo=None)

    @staticmethod
    def _restriction_deadline(minutes: int = 1) -> datetime:
        return RestrictSubmissionHelper.now_local_naive() + timedelta(minutes=minutes)

    @staticmethod
    async def restrict_user_submission(db: AsyncSession, user_id: int) -> None:
        """Restrict a user from submitting complaints."""
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                can_submit_complaints=False,
                is_restricted_until=RestrictSubmissionHelper._restriction_deadline(minutes=1440), ## 1 day
            )
        )
        await db.commit()

    @staticmethod
    async def restrict_user_submissions(db: AsyncSession, user_ids: List[int]) -> None:
        """Restrict multiple users from submitting complaints in one query."""
        if not user_ids:
            return

        await db.execute(
            update(User)
            .where(User.id.in_(user_ids))
            .values(
                can_submit_complaints=False,
                is_restricted_until=RestrictSubmissionHelper._restriction_deadline(minutes=1440), ## 1 day
            )
        )  # Example: restrict for 1 day for testing
        await db.commit()


class RejectCounterHelper:
    """Helper for managing complaint rejection counts."""

    @staticmethod
    async def increment_reject_counter(db: AsyncSession, user_ids: List[int]) -> None:
        """Increment reject counters by occurrence count in user_ids."""
        if not user_ids:
            return

        # Count occurrences so repeated complaints from the same user
        # increment that user's counter multiple times in one batch.
        user_counts = Counter(user_ids)
        for user_id, increment_by in user_counts.items():
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(reject_counter=func.coalesce(User.reject_counter, 0) + increment_by)
            )
        await db.commit()

    @staticmethod
    async def get_reject_counters(db: AsyncSession, user_ids: List[int]) -> dict[int, int]:
        """Fetch latest reject counters for users."""
        if not user_ids:
            return {}

        result = await db.execute(
            select(
                User.id,
                func.coalesce(User.reject_counter, 0),
            ).where(User.id.in_(user_ids))
        )
        return {user_id: counter for user_id, counter in result.all()}
        
class StatisticsHelper:
    """Helper for computing complaint statistics efficiently using database aggregation."""

    @staticmethod
    async def get_status_counts_by_date_range(
        db: AsyncSession,
        barangay_id: int,
        start_date,
        end_date
    ) -> Tuple[dict, List]:
        """Get complaint counts by status for a date range.
        
        Returns:
            (status_counts_dict, list_of_tuples_with_date_status_count)
        """
        from sqlalchemy import and_

        complaint_date = cast(Complaint.created_at, Date)
        
        result = await db.execute(
            select(
                complaint_date,
                Complaint.status,
                func.count(Complaint.id).label('count')
            )
            .where(
                and_(
                    Complaint.barangay_id == barangay_id,
                    Complaint.created_at >= start_date,
                    Complaint.created_at <= end_date
                )
            )
            .group_by(complaint_date, Complaint.status)
        )
        
        rows = result.all()
        status_totals = {
            'submitted': 0,
            'resolved': 0,
            'forwarded': 0,
            'under_review': 0
        }
        
        for row in rows:
            date_str, status_val, count = row
            if status_val == 'submitted':
                status_totals['submitted'] += count
            elif status_val == 'resolved_by_barangay' or status_val == 'resolved_by_department':
                status_totals['resolved'] += count
            elif status_val == 'forwarded_to_lgu':
                status_totals['forwarded'] += count
            elif status_val == 'reviewed_by_barangay':
                status_totals['under_review'] += count
        
        return status_totals, rows

    @staticmethod
    async def get_category_counts(
        db: AsyncSession,
        barangay_id: int,
        start_date,
        end_date
    ) -> dict:
        """Get complaint counts by category using database aggregation."""
        from sqlalchemy import func, and_
        
        result = await db.execute(
            select(
                Category.category_name,
                func.count(Complaint.id).label('count')
            )
            .join(Complaint, Complaint.category_id == Category.id)
            .where(
                and_(
                    Complaint.barangay_id == barangay_id,
                    Complaint.created_at >= start_date,
                    Complaint.created_at <= end_date
                )
            )
            .group_by(Category.category_name)
        )
        
        return {row[0]: row[1] for row in result.all() if row[0]}
