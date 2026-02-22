
from datetime import datetime

from fastapi import logger
from app.models.incident_model import IncidentModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from sqlalchemy import update, cast
from sqlalchemy.dialects.postgresql import INTERVAL

logger = logging.getLogger(__name__)
async def resolve_expired_incidents(db: AsyncSession) -> None:
    now = datetime.utcnow()

    result = await db.execute(
        update(IncidentModel)
        .where(
            IncidentModel.status == "ACTIVE",
            IncidentModel.last_reported_at + cast(
                func.concat(IncidentModel.time_window_hours, ' hours'),
                INTERVAL
            ) <= now,
        )
        .values(status="EXPIRED")
        .returning(IncidentModel.id)
    )
    resolved_count = len(result.fetchall())
    await db.commit()
    logger.info(f"Resolved {resolved_count} expired incidents")