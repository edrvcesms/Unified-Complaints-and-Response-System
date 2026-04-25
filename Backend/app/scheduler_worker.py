# scheduler_worker.py

import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.domain.infrastracture.jobs.incident_jobs import run_resolve_expired_incidents
from app.domain.infrastracture.jobs.incident_expiration_alert import run_expiry_warning_notifications
from app.utils.logger import logger


async def main():
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        run_resolve_expired_incidents,
        "interval",
        hours=1,
        id="resolve_expired_incidents",
        replace_existing=True,
    )

    scheduler.add_job(
        run_expiry_warning_notifications,
        "interval",
        hours=1,
        id="expiry_warning_notifications",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler worker started.")

    # Keep process alive
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())