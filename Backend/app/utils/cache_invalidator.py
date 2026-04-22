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
    event_ids: Optional[List[int]] = None,
    barangay_id: Optional[int] = None,
    department_account_id: Optional[int] = None,
    announcement_uploader_id: Optional[int] = None,
    announcement_id: Optional[int] = None,
    include_global: bool = True,
    response_id: Optional[int] = None
):
    """
    Centralized cache invalidation.

    Pass only what you know:
    - complaint_ids → clears complaint-level caches
    - user_ids → clears user caches
    - incident_ids → clears incident caches
    - barangay_id → clears barangay caches
    - department_account_id → clears department caches
    - announcement_uploader_id → clears announcement caches for a specific uploader
        - announcement_id → clears caches related to a specific announcement
        - include_global → if True, also clears global caches like "all_complaints", "all_barangays", etc.
    """

    now = datetime.utcnow()
    tasks = set()
    
    if response_id:
        tasks.add(f"response:{response_id}")
        logger.info(f"Response cache added for response_id: {response_id}")
    
    if announcement_uploader_id:
        tasks.add(f"all_announcements")
        tasks.add(f"announcements_by_uploader:{announcement_uploader_id}")
        tasks.add(f"announcement:{announcement_id}")
        logger.info(f"Announcement caches added for uploader_id: {announcement_uploader_id}, announcement_id: {announcement_id}")
    
    if include_global:
        tasks.update([
            "all_complaints",
            "all_barangays",
            "all_forwarded_incidents",
            "lgu:complaint_counts_by_barangay_category"
        ])
        logger.info("Global caches added to invalidation list")

    if incident_ids:
        for incident_id in incident_ids:
            tasks.update([
                f"incident:{incident_id}",
                f"incident_complaints:{incident_id}",
            ])
        logger.info(f"Incident caches added for incident_ids: {incident_ids}")

    if event_ids:
        tasks.add("events_cache")
        for event_id in event_ids:
            tasks.add(f"event_{event_id}")
        logger.info(f"Event caches added for event_ids: {event_ids}")

    if barangay_id:
        tasks.update([
            f"all_incidents:{barangay_id}",
            f"barangay_incidents:{barangay_id}",
            f"barangay_{barangay_id}_complaints",
            f"complaint_stats:weekly:{barangay_id}",
            f"complaint_stats:monthly:{barangay_id}:{now.year}:{now.month}",
            f"complaint_stats:yearly:{barangay_id}:{now.year}",
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