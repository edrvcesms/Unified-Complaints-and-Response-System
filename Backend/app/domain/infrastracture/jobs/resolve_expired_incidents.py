
from datetime import datetime

from fastapi import logger
from app.constants.complaint_status import ComplaintStatus
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.models.incident_model import IncidentModel
from sqlalchemy import and_, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from sqlalchemy import update, cast, or_
from sqlalchemy.dialects.postgresql import INTERVAL

logger = logging.getLogger(__name__)

RESOLVED_STATUSES = {
    ComplaintStatus.RESOLVED_BY_BARANGAY.value,
    ComplaintStatus.RESOLVED_BY_LGU.value,
    ComplaintStatus.RESOLVED_BY_DEPARTMENT.value,
}

async def resolve_expired_incidents(db: AsyncSession) -> None:
    now = datetime.utcnow()

    result = await db.execute(
        update(IncidentModel)
        .where(
            IncidentModel.last_reported_at + cast(
                func.concat(IncidentModel.time_window_hours, ' hours'),
                INTERVAL
            ) <= now,
            exists(
                select(1)
                .select_from(IncidentComplaintModel)
                .join(Complaint, Complaint.id == IncidentComplaintModel.complaint_id)
                .where(
                    and_(
                        IncidentComplaintModel.incident_id == IncidentModel.id,
                        or_(
                            Complaint.status.is_(None),
                            Complaint.status.notin_(list(RESOLVED_STATUSES)),
                        ),
                    )
                )
            ),
        )
        .values(status="EXPIRED")
        .returning(IncidentModel.id)
    )
    resolved_count = len(result.fetchall())
    await db.commit()
    logger.info(f"Resolved {resolved_count} expired incidents")