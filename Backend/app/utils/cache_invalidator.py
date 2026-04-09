import asyncio
from datetime import datetime
from typing import List, Optional
from app.utils.logger import logger

from app.utils.caching import delete_cache


async def invalidate_cache(
    *,
    complaint_ids: Optional[List[int]] = None,
    user_ids: Optional[List[int]] = None,
    incident_ids: Optional[List[int]] = None,
    barangay_id: Optional[int] = None,
    department_account_id: Optional[int] = None,
    include_global: bool = True,
):
    """
    Centralized cache invalidation.

    Pass only what you know:
    - complaint_ids → clears complaint-level caches
    - user_ids → clears user caches
    - incident_ids → clears incident caches
    - barangay_id → clears barangay caches
    - department_account_id → clears department caches
    """

    now = datetime.utcnow()
    tasks = set()
    
    if include_global:
        tasks.update([
            "all_complaints",
            "all_barangays",
            "all_forwarded_incidents",
        ])
        logger.info("Global caches added to invalidation list")

    if incident_ids:
        for incident_id in incident_ids:
            tasks.update([
                f"incident:{incident_id}",
                f"incident_complaints:{incident_id}",
            ])
        logger.info(f"Incident caches added for incident_ids: {incident_ids}")

    if barangay_id:
        tasks.update([
            f"barangay_incidents:{barangay_id}",
            f"barangay_{barangay_id}_complaints",
            f"weekly_complaint_stats_by_barangay:{barangay_id}",
            f"forwarded_barangay_incidents:{barangay_id}",
            f"monthly_report_by_barangay:{barangay_id}:{now.month}:{now.year}",
        ])
        logger.info(f"Barangay caches added for barangay_id: {barangay_id}")

    if department_account_id:
        tasks.update([
            f"department_incidents:{department_account_id}",
            f"weekly_forwarded_incidents_stats:{department_account_id}",
            f"forwarded_department_incidents:{department_account_id}",
        ])
        logger.info(f"Department caches added for department_account_id: {department_account_id}")

    if complaint_ids:
        for cid in complaint_ids:
            tasks.add(f"complaint:{cid}")
        logger.info(f"Complaint caches added for complaint_ids: {complaint_ids}")


    if user_ids:
        for uid in user_ids:
            tasks.update([
                f"user_complaints:{uid}",
                f"user_notifications:{uid}",
            ])
        logger.info(f"User caches added for user_ids: {user_ids}")
    if tasks:
      await asyncio.gather(*(delete_cache(key) for key in tasks))