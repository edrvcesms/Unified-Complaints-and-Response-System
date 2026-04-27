from app.celery_worker import celery_worker
from app.database.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select, update
from app.utils.logger import logger
from fastapi import HTTPException, status
from app.tasks.worker_loop import run_async
from app.utils.query_optimization import RestrictSubmissionHelper
from app.utils.cache_invalidator_optimized import invalidate_cache

@celery_worker.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.tasks.restriction_tasks.unrestrict_users_task",
)
def unrestrict_users_task(self):
    try:
        run_async(run_unrestrict_users())
        logger.info("Unrestricted users successfully.")
    except Exception as e:
        logger.exception("Unrestrict users failed")
        raise self.retry(exc=e)

async def run_unrestrict_users():
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(User).where(
                    User.is_restricted_until != None,
                    User.is_restricted_until <= RestrictSubmissionHelper.now_local_naive()
                )
            )
            users_to_unrestrict = result.scalars().all()
            user_ids = [user.id for user in users_to_unrestrict]
            
            if not user_ids:
                logger.info("No users to unrestrict at this time.")
                return
            
            await db.execute(
                update(User)
                .where(User.id.in_(user_ids))
                .values(can_submit_complaints=True, reject_counter=0, is_restricted_until=None)
            )
            
            await db.commit()
            
            await invalidate_cache(user_ids = user_ids)
            logger.info(f"Unrestricted {len(user_ids)} users: {user_ids}")
        
        except Exception as e:
            await db.rollback()
            logger.exception(f"Error in run_unrestrict_users: {e}")