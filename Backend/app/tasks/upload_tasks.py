from app.core.config import settings
from app.models.response_attachments import ResponseAttachments
from datetime import datetime, timezone
from app.tasks.worker_loop import run_async
from app.models.attachment import Attachment
from app.models.announcement_media import AnnouncementMedia
from app.models.event_media import EventMedia
import resend
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import (
    upload_multiple_files_to_cloudinary,
    delete_multiple_from_cloudinary,
    extract_public_id_from_url,
)
from app.utils.logger import logger
from app.celery_worker import celery_worker
from app.utils.cache_invalidator_optimized import invalidate_cache
from app.utils.upload_helper import prepare_upload_files

resend.api_key = settings.RESEND_API_KEY


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_attachments_task(self, files_data, complaint_id: int, uploader_id: int):

    async def _run():
        file_objs = []

        try:
            file_objs = prepare_upload_files(files_data)

            urls = await upload_multiple_files_to_cloudinary(file_objs, folder="ucrs/attachments")

            async with AsyncSessionLocal() as db:
                attachments = [
                    Attachment(
                        file_name=f["filename"],
                        file_type=f["content_type"],
                        file_size=f.get("file_size", 0),
                        file_path=url,
                        uploaded_at=datetime.now(timezone.utc),
                        complaint_id=complaint_id,
                        uploaded_by=uploader_id,
                    )
                    for f, url in zip(files_data, urls)
                ]

                db.add_all(attachments)
                await db.commit()

            return urls

        finally:
            for f in file_objs:
                try:
                    f.file.close()
                except Exception:
                    pass

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Upload failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_announcement_media_task(self, files_data, announcement_id: int, uploader_id: int):

    async def _run():
        file_objs = []

        try:
            file_objs = prepare_upload_files(files_data)

            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/announcements"
            )

            async with AsyncSessionLocal() as db:
                media_records = [
                    AnnouncementMedia(
                        announcement_id=announcement_id,
                        media_type=f["content_type"].split("/")[0],
                        media_url=url,
                        uploaded_at=datetime.now(timezone.utc),
                    )
                    for f, url in zip(files_data, urls)
                ]

                db.add_all(media_records)
                await db.commit()

            return urls

        finally:
            for f in file_objs:
                try:
                    f.file.close()
                except Exception:
                    pass
            try:
                await invalidate_cache(
                    announcement_uploader_id=uploader_id,
                    announcement_id=announcement_id,
                )
            except Exception as e:
                logger.exception(f"Cache invalidation failed after upload: {e}")
            logger.info(
                f"Enqueued upload task for {len(files_data)} media files and invalidated relevant caches"
            )

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Announcement media upload failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_announcement_media_task(self, public_ids, announcement_id: int, uploader_id: int):

    async def _run():
        ids = [public_ids] if isinstance(public_ids, str) else public_ids

        logger.info(
            f"uploader_id={uploader_id} requested deletion of {len(ids)} media files "
            f"for announcement_id={announcement_id}"
        )
        logger.debug(f"delete_announcement_media_task ids (sample): {ids[:5]}")

        normalized_ids = []
        for media_id in ids:
            if isinstance(media_id, str) and media_id.startswith("http"):
                extracted = extract_public_id_from_url(media_id)
                if extracted:
                    normalized_ids.append(extracted)
                else:
                    logger.warning(f"Failed to extract public_id from URL: {media_id}")
            else:
                normalized_ids.append(media_id)

        results = await delete_multiple_from_cloudinary(normalized_ids)

        async with AsyncSessionLocal() as db:
            await db.execute(
                AnnouncementMedia.__table__.delete()
                .where(AnnouncementMedia.media_url.in_(ids))
                .where(AnnouncementMedia.announcement_id == announcement_id)
            )
            await db.commit()

        try:
            await invalidate_cache(
                announcement_uploader_id=uploader_id,
                announcement_id=announcement_id,
            )
        except Exception as e:
            logger.exception(f"Cache invalidation failed after deletion: {e}")

        logger.info(
            f"uploader_id={uploader_id} deletion task completed for announcement_id={announcement_id} "
            f"with {sum(results)} successes and {len(results) - sum(results)} failures"
        )

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Delete failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_event_media_task(self, files_data, event_id: int):

    async def _run():
        file_objs = []

        try:
            file_objs = prepare_upload_files(files_data)

            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/events"
            )

            async with AsyncSessionLocal() as db:
                media_records = [
                    EventMedia(
                        event_id=event_id,
                        media_type=f["content_type"].split("/")[0],
                        media_url=url,
                        uploaded_at=datetime.now(timezone.utc),
                    )
                    for f, url in zip(files_data, urls)
                ]

                db.add_all(media_records)
                await db.commit()

            return urls

        finally:
            for f in file_objs:
                try:
                    f.file.close()
                except Exception:
                    pass
            try:
                await invalidate_cache(event_ids=[event_id])
            except Exception as e:
                logger.exception(f"Cache invalidation failed after event media upload: {e}")

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Event media upload failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_event_media_task(self, public_ids, event_id: int):

    async def _run():
        ids = [public_ids] if isinstance(public_ids, str) else public_ids

        logger.info(f"event_id={event_id} requested deletion of {len(ids)} media files")
        logger.debug(f"delete_event_media_task ids (sample): {ids[:5]}")

        normalized_ids = []
        for media_id in ids:
            if isinstance(media_id, str) and media_id.startswith("http"):
                extracted = extract_public_id_from_url(media_id)
                if extracted:
                    normalized_ids.append(extracted)
                else:
                    logger.warning(f"Failed to extract public_id from URL: {media_id}")
            else:
                normalized_ids.append(media_id)

        results = await delete_multiple_from_cloudinary(normalized_ids)

        async with AsyncSessionLocal() as db:
            await db.execute(
                EventMedia.__table__.delete()
                .where(EventMedia.media_url.in_(ids))
                .where(EventMedia.event_id == event_id)
            )
            await db.commit()

        try:
            await invalidate_cache(event_ids=[event_id])
        except Exception as e:
            logger.exception(f"Cache invalidation failed after event media deletion: {e}")

        logger.info(
            f"event_id={event_id} deletion task completed with "
            f"{sum(results)} successes and {len(results) - sum(results)} failures"
        )

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Event media delete failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_remarks_attachment(self, files_data, response_id: int, responder_id: int):

    async def _run():
        file_objs = []

        try:
            file_objs = prepare_upload_files(files_data)

            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/remarks"
            )

            async with AsyncSessionLocal() as db:
                remarks_files = [
                    ResponseAttachments(
                        response_id=response_id,
                        file_url=url,
                        media_type=f["content_type"].split("/")[0],
                        created_at=datetime.now(timezone.utc),
                    )
                    for f, url in zip(files_data, urls)
                ]

                db.add_all(remarks_files)
                await db.commit()

            return urls

        finally:
            for f in file_objs:
                try:
                    f.file.close()
                except Exception:
                    pass
            try:
                await invalidate_cache(response_id=response_id)
            except Exception as e:
                logger.exception(f"Cache invalidation failed after remarks attachment upload: {e}")
            logger.info(
                f"Enqueued upload task for {len(files_data)} response attachments "
                f"and invalidated relevant caches"
            )

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Response attachment upload failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_cloudinary_media_task(self, public_ids):

    async def _run():
        ids = [public_ids] if isinstance(public_ids, str) else public_ids

        logger.info(f"delete_cloudinary_media_task received {len(ids)} public_id(s)")
        logger.debug(f"delete_cloudinary_media_task ids (sample): {ids[:5]}")

        normalized_ids = []
        for media_id in ids:
            if isinstance(media_id, str) and media_id.startswith("http"):
                extracted = extract_public_id_from_url(media_id)
                if extracted:
                    normalized_ids.append(extracted)
                else:
                    logger.warning(f"Failed to extract public_id from URL: {media_id}")
            else:
                normalized_ids.append(media_id)

        results = await delete_multiple_from_cloudinary(normalized_ids)

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.exception(f"Delete failed: {e}")
        raise self.retry(exc=e)