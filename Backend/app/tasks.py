from app.models.response import Response
from app.models.response_attachments import ResponseAttachments
from app.utils.template_renderer import render_template
from datetime import datetime, timezone
from app.services.sse_manager import sse_manager
import asyncio
import atexit
import base64
import io
import os
from sqlalchemy import func
from app.models.notification import Notification
from app.models.complaint import Complaint
from app.models.attachment import Attachment
from app.models.announcement_media import AnnouncementMedia
from app.models.response import Response
from app.models.event_media import EventMedia
from fastapi_mail import FastMail, MessageSchema
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from sqlalchemy.orm import selectinload
from app.models.incident_complaint import IncidentComplaintModel
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import (upload_multiple_files_to_cloudinary,delete_multiple_from_cloudinary,extract_public_id_from_url,)
from app.utils.caching import delete_cache
from app.utils.cache_invalidator import invalidate_cache
from app.core.email_config import conf
from sqlalchemy import select
from app.utils.logger import logger
from fastapi import UploadFile
from app.celery_worker import celery_worker
from starlette.datastructures import Headers
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.repository.incident_repository import IncidentRepository
from dotenv import load_dotenv
from app.utils.push_notifications import send_push_notification
from app.domain.infrastracture.llm.openai_incident_verifier import OpenAIIncidentVerifier
from app.domain.config.embeddings.openai_embedding import OpenAIEmbeddingService
from app.utils.attachments import validate_encoded_upload
load_dotenv()
from app.core.config import settings

_vector_repository = None
_severity_calculator = None
_openai_incident_verifier = None
_openai_embedding_service = None

def get_openai_incident_verifier():
    global _openai_incident_verifier
    if _openai_incident_verifier is None:
        _openai_incident_verifier = OpenAIIncidentVerifier(api_key=settings.OPEN_AI_API_KEY)
    return _openai_incident_verifier

def get_openai_embedding_service():
    global _openai_embedding_service
    if _openai_embedding_service is None:
        _openai_embedding_service = OpenAIEmbeddingService(api_key=settings.OPEN_AI_API_KEY)
    return _openai_embedding_service

def get_vector_repository():
    global _vector_repository
    if _vector_repository is None:
        _vector_repository = PineconeVectorRepository(
            api_key=os.environ["PINECONE_API_KEY"],
            environment=os.environ.get("PINECONE_ENVIRONMENT", "us-east-1"),
        )
    return _vector_repository

def get_severity_calculator():
    global _severity_calculator
    if _severity_calculator is None:
        _severity_calculator = WeightedSeverityCalculator()
    return _severity_calculator


_celery_event_loop = None

def _get_or_create_celery_event_loop():
    """Reuse one event loop per Celery worker process for async resources."""
    global _celery_event_loop

    if _celery_event_loop is not None and not _celery_event_loop.is_closed():
        asyncio.set_event_loop(_celery_event_loop)
        return _celery_event_loop

    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("Current event loop is closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    _celery_event_loop = loop
    return loop


def _close_celery_event_loop():
    global _celery_event_loop
    if _celery_event_loop is not None and not _celery_event_loop.is_closed():
        _celery_event_loop.close()
    _celery_event_loop = None


atexit.register(_close_celery_event_loop)


def run_async(coro):
    loop = _get_or_create_celery_event_loop()

    if loop.is_running():
        # Defensive fallback for unexpected nested-loop environments.
        temp_loop = asyncio.new_event_loop()
        try:
            return temp_loop.run_until_complete(coro)
        finally:
            temp_loop.close()

    return loop.run_until_complete(coro)

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, subject: str, recipient: str, body: str):
    async def _send():
        message = MessageSchema(subject=subject, recipients=[recipient], body=body, subtype="html")
        fm = FastMail(conf)
        await fm.send_message(message)

    try:
        run_async(_send())
        logger.info(f"Email sent to {recipient}")
    except Exception as e:
        logger.error(f"Email failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification_task(self, token: str, enabled: bool, title: str = None, body: str = "", data: dict = None, sound: str = "default", expo_token: str = None):
    try:
        result = send_push_notification(
            token=token,
            enabled=enabled,
            title=title,
            body=body,
            data=data or {},
            sound=sound,
            expo_token=expo_token,
        )
        if not result["success"]:
            logger.error(f"Push notification failed: {result}")
        else:
            logger.info(f"Push notification sent successfully: {result}")
    except Exception as e:
        logger.error(f"Push notification task failed: {e}")
        raise self.retry(exc=e)

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, recipient: str, otp: str, purpose: str):
    subject = f"OTP Code ({purpose})"
    body = render_template("email_otp.html", {"otp": otp, "purpose": purpose})
    send_email_task.delay(subject, recipient, body)
    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def notify_user_for_hearing_task(
    self,
    recipient: str,
    barangay_name: str,
    compliant_name: str,
    hearing_day: str,
    hearing_month: str,
    hearing_year: str,
    hearing_time: str,
    issued_day: str,
    issued_month: str,
    issued_year: str,
    notified_day: str,
    notified_month: str,
    notified_year: str
):
    subject = "Notice of Hearing for Your Complaint - Unified Complaints and Response System (UCRS)"
    body = render_template(
        "hearing_notification_email.html",
        {
            "barangay_name": barangay_name,
            "compliant_name": compliant_name,
            "hearing_day": hearing_day,
            "hearing_month": hearing_month,
            "hearing_year": hearing_year,
            "hearing_time": hearing_time,
            "issued_day": issued_day,
            "issued_month": issued_month,
            "issued_year": issued_year,
            "notified_day": notified_day,
            "notified_month": notified_month,
            "notified_year": notified_year
        }
    )
    send_email_task.delay(subject=subject, recipient=recipient, body=body)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_attachments_task(self, files_data, complaint_id: int, uploader_id: int):

    async def _run():
        file_objs = []

        try:
            for f in files_data:
                validate_encoded_upload(f)
                content_bytes = base64.b64decode(f["content_b64"])
                file_obj = io.BytesIO(content_bytes)
                upload_file = UploadFile(
                    filename=f["filename"],
                    file=file_obj,
                    headers=Headers({"content-type": f["content_type"]}),
                )
                file_objs.append(upload_file)

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
                except:
                    pass

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise self.retry(exc=e)
    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_announcement_media_task(self, files_data, announcement_id: int, uploader_id: int):

    async def _run():
        file_objs = []

        try:
            # Prepare UploadFile objects
            for f in files_data:
                validate_encoded_upload(f)
                content_bytes = base64.b64decode(f["content_b64"])
                file_obj = io.BytesIO(content_bytes)
                upload_file = UploadFile(
                    filename=f["filename"],
                    file=file_obj,
                    headers=Headers({"content-type": f["content_type"]}),
                )
                file_objs.append(upload_file)

            # Upload to Cloudinary
            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/announcements"
            )

            # Save to DB
            async with AsyncSessionLocal() as db:
                media_records = []

                for f, url in zip(files_data, urls):
                    media_records.append(
                        AnnouncementMedia(
                            announcement_id=announcement_id,
                            media_type=f["content_type"].split("/")[0],
                            media_url=url,
                            uploaded_at=datetime.now(timezone.utc),
                        )
                    )

                db.add_all(media_records)
                await db.commit()
                await invalidate_cache(announcement_uploader_id=uploader_id, announcement_id=announcement_id)

            return urls

        finally:
            # Close files
            for f in file_objs:
                try:
                    f.file.close()
                except:
                    pass
            
            await invalidate_cache(announcement_uploader_id=uploader_id, announcement_id=announcement_id)
            logger.info(f"Enqueued upload task for {len(files_data)} media files and invalidated relevant caches")

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Announcement media upload failed: {e}")
        raise self.retry(exc=e)  
    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_announcement_media_task(self, public_ids, announcement_id: int, uploader_id: int):

    async def _run():
        if isinstance(public_ids, str):
            ids = [public_ids]
        else:
            ids = public_ids
            
        logger.info(f"uploader_id={uploader_id} requested deletion of {len(ids)} media files for announcement_id={announcement_id}")

        logger.info(f"delete_announcement_media_task received {len(ids)} public_id(s) for announcement_id={announcement_id}")
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

        if len(normalized_ids) != len(ids):
            logger.info(
                f"Normalized {len(normalized_ids)} public_id(s) for announcement_id={announcement_id}"
            )

        results = await delete_multiple_from_cloudinary(normalized_ids)

        async with AsyncSessionLocal() as db:
            await db.execute(
                AnnouncementMedia.__table__.delete()
                .where(AnnouncementMedia.media_url.in_(ids))
                .where(AnnouncementMedia.announcement_id == announcement_id)
            )
            await db.commit()

        await invalidate_cache(announcement_uploader_id=uploader_id, announcement_id=announcement_id)
        logger.info(f"uploader_id={uploader_id} deletion task completed for announcement_id={announcement_id} with {sum(results)} successes and {len(results) - sum(results)} failures")

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise self.retry(exc=e)
        
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_event_media_task(self, files_data, event_id: int):

    async def _run():
        file_objs = []

        try:
            # Prepare UploadFile objects
            for f in files_data:
                validate_encoded_upload(f)
                content_bytes = base64.b64decode(f["content_b64"])
                file_obj = io.BytesIO(content_bytes)
                upload_file = UploadFile(
                    filename=f["filename"],
                    file=file_obj,
                    headers=Headers({"content-type": f["content_type"]}),
                )
                file_objs.append(upload_file)

            # Upload to Cloudinary
            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/events"
            )

            # Save to DB
            async with AsyncSessionLocal() as db:
                media_records = []

                for f, url in zip(files_data, urls):
                    media_records.append(
                        EventMedia(
                            event_id=event_id,
                            media_type=f["content_type"].split("/")[0],
                            media_url=url,
                            uploaded_at=datetime.now(timezone.utc),
                        )
                    )

                db.add_all(media_records)
                await db.commit()
                await invalidate_cache(event_ids=[event_id])

            return urls

        finally:
            # Close files
            for f in file_objs:
                try:
                    f.file.close()
                except:
                    pass

            await invalidate_cache(event_ids=[event_id])

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Event media upload failed: {e}")
        raise self.retry(exc=e)

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_event_media_task(self, public_ids, event_id: int):

    async def _run():
        if isinstance(public_ids, str):
            ids = [public_ids]
        else:
            ids = public_ids

        logger.info(f"event_id={event_id} requested deletion of {len(ids)} media files")
        logger.info(f"delete_event_media_task received {len(ids)} public_id(s) for event_id={event_id}")
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

        if len(normalized_ids) != len(ids):
            logger.info(f"Normalized {len(normalized_ids)} public_id(s) for event_id={event_id}")

        results = await delete_multiple_from_cloudinary(normalized_ids)

        async with AsyncSessionLocal() as db:
            await db.execute(
                EventMedia.__table__.delete()
                .where(EventMedia.media_url.in_(ids))
                .where(EventMedia.event_id == event_id)
            )
            await db.commit()

        await invalidate_cache(event_ids=[event_id])
        logger.info(
            f"event_id={event_id} deletion task completed with {sum(results)} successes and {len(results) - sum(results)} failures"
        )

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Event media delete failed: {e}")
        raise self.retry(exc=e)
    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_remarks_attachment(self, files_data, response_id: int, responder_id: int):

    async def _run():
        file_objs = []

        try:
            # Prepare UploadFile objects
            for f in files_data:
                validate_encoded_upload(f)
                content_bytes = base64.b64decode(f["content_b64"])
                file_obj = io.BytesIO(content_bytes)
                upload_file = UploadFile(
                    filename=f["filename"],
                    file=file_obj,
                    headers=Headers({"content-type": f["content_type"]}),
                )
                file_objs.append(upload_file)

            # Upload to Cloudinary
            urls = await upload_multiple_files_to_cloudinary(
                file_objs, folder="ucrs/remarks"
            )

            # Save to DB
            async with AsyncSessionLocal() as db:
                remarks_files = []

                for f, url in zip(files_data, urls):
                    remarks_files.append(
                        ResponseAttachments(
                            response_id=response_id,
                            file_url=url,
                            media_type=f["content_type"].split("/")[0],
                            created_at=datetime.now(timezone.utc),
                        )
                    )

                db.add_all(remarks_files)
                await db.commit()
                await invalidate_cache(response_id=response_id)

            return urls

        finally:
            # Close files
            for f in file_objs:
                try:
                    f.file.close()
                except:
                    pass
            
            await invalidate_cache(response_id=response_id)
            logger.info(f"Enqueued upload task for {len(files_data)} response attachments and invalidated relevant caches")

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Response attachment upload failed: {e}")
        raise self.retry(exc=e)  
    

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_cloudinary_media_task(self, public_ids):

    async def _run():
        if isinstance(public_ids, str):
            ids = [public_ids]
        else:
            ids = public_ids

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

        if len(normalized_ids) != len(ids):
            logger.info(f"Normalized {len(normalized_ids)} public_id(s) for delete_cloudinary_media_task")

        results = await delete_multiple_from_cloudinary(normalized_ids)

        return {
            "deleted": sum(results),
            "failed": len(results) - sum(results),
        }

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=5)
def recalculate_severity_task(self, incident_id: int):

    async def _run():
        async with AsyncSessionLocal() as db:
            repo = IncidentRepository(db)
            velocity = DetectVelocitySpikeUseCase(repo)

            use_case = RecalculateSeverityUseCase(
                incident_repository=repo,
                severity_calculator=get_severity_calculator(),
                velocity_detector=velocity,
            )

            incident = await use_case.execute(incident_id)
            await db.commit()
            return incident

    incident = run_async(_run())

    return {
        "incident_id": incident.id,
        "severity_score": incident.severity_score,
        "severity_level": incident.severity_level.value,
    }




@celery_worker.task(
    bind=True,
    name="app.tasks.cluster_complaint_task",
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(Exception,),
)
def cluster_complaint_task(self, complaint_data: dict):

    cluster_data = ClusterComplaintSchema.model_validate(complaint_data)
    logger.info(f"[cluster_complaint_task] Started clustering for complaint_id={cluster_data.complaint_id}")

    async def _run():
        async with AsyncSessionLocal() as db:
            incident_repo = IncidentRepository(db)

            use_case = ClusterComplaintUseCase(
                embedding_service=get_openai_embedding_service(),
                vector_repository=get_vector_repository(),
                incident_repository=incident_repo,
                incident_verifier=get_openai_incident_verifier()
            )

            input_dto = ClusterComplaintInput(
                complaint_id=cluster_data.complaint_id,
                user_id=cluster_data.user_id,
                title=cluster_data.title,
                latitude=cluster_data.latitude,
                longitude=cluster_data.longitude,
                description=cluster_data.description,
                barangay_id=cluster_data.barangay_id,
                category_id=cluster_data.category_id,
                category_radius_km=cluster_data.category_radius_km,
                category_time_window_hours=cluster_data.category_time_window_hours,
                category_base_severity_weight=cluster_data.category_base_severity_weight,
                similarity_threshold=cluster_data.similarity_threshold,
                created_at=cluster_data.created_at
            )

            result = await use_case.execute(input_dto)

            if not result.is_new_incident and result.existing_incident_status:
                complaint_result = await db.execute(
                    select(Complaint)
                    .options(selectinload(Complaint.user), selectinload(Complaint.barangay))
                    .where(Complaint.id == cluster_data.complaint_id)
                )

                complaint = complaint_result.scalars().first()

                if complaint:
                    if result.existing_incident_status != "submitted":
                        complaint.status = result.existing_incident_status
                        complaint.updated_at = datetime.now(timezone.utc)

                        if result.existing_incident_status in ["forwarded_to_lgu", "forwarded_to_department"] and not complaint.forwarded_at:
                            complaint.forwarded_at = datetime.now(timezone.utc)

                        if result.existing_incident_status == "resolved" and not complaint.resolved_at:
                            complaint.resolved_at = datetime.now(timezone.utc)

                    # SAVE NOTIFICATION
                    notification = Notification(
                        user_id=cluster_data.user_id,
                        complaint_id=cluster_data.complaint_id,
                        title="Update on your complaint",
                        message=result.message or f"Your complaint is linked to an existing report. Status: {result.existing_incident_status}",
                        notification_type="info",
                        channel="in_app",
                        is_read=False,
                        sent_at=datetime.now(timezone.utc),
                    )
                    db.add(notification)

                    # HEARING DATE LOOKUP
                    hearing_date_result = await db.execute(
                        select(func.max(Complaint.hearing_date))
                        .join(
                            IncidentComplaintModel,
                            IncidentComplaintModel.complaint_id == Complaint.id
                        )
                        .where(
                            IncidentComplaintModel.incident_id == result.incident_id,
                            Complaint.hearing_date.isnot(None)
                        )
                    )

                    incident_hearing_date = hearing_date_result.scalar_one_or_none()

                    if incident_hearing_date:
                        complaint.hearing_date = incident_hearing_date

                        if incident_hearing_date > datetime.now(timezone.utc):
                            user_name = (
                                f"{complaint.user.first_name} {complaint.user.last_name}".strip()
                                if complaint.user else "User"
                            )

                            notify_user_for_hearing_task.delay(
                                recipient=complaint.user.email,
                                barangay_name=complaint.barangay.barangay_name if complaint.barangay else "N/A",
                                compliant_name=user_name,
                                hearing_day=incident_hearing_date.strftime("%d"),
                                hearing_month=incident_hearing_date.strftime("%B"),
                                hearing_year=incident_hearing_date.strftime("%Y"),
                                issued_day=datetime.now(timezone.utc).strftime("%d"),
                                issued_month=datetime.now(timezone.utc).strftime("%B"),
                                issued_year=datetime.now(timezone.utc).strftime("%Y"),
                                notified_day=datetime.now(timezone.utc).strftime("%d"),
                                notified_month=datetime.now(timezone.utc).strftime("%B"),
                                notified_year=datetime.now(timezone.utc).strftime("%Y"),
                                hearing_time=incident_hearing_date.strftime("%I:%M %p")
                            )

                        else:
                            send_notifications_task.delay(
                                user_id=cluster_data.user_id,
                                title="Hearing update",
                                message=f"Hearing already happened on {incident_hearing_date}",
                                complaint_id=cluster_data.complaint_id,
                                notification_type="info"
                            )

            await db.commit()

            await invalidate_cache(
                complaint_ids=[cluster_data.complaint_id],
                user_ids=[cluster_data.user_id],
                barangay_id=cluster_data.barangay_id,
                incident_ids=[result.incident_id],
                include_global=True,
            )
            return result

    result = run_async(_run())

    # CACHE CLEANUP
    async def _cleanup_cache():
        keys = [
            f"complaint:{cluster_data.complaint_id}",
            f"incident:{result.incident_id}",
            f"user_notifications:{cluster_data.user_id}",
        ]
        for k in keys:
            await delete_cache(k)

    run_async(_cleanup_cache())

    # TRIGGER SEVERITY RECALCULATION
    recalculate_severity_task.apply_async(
        args=[result.incident_id],
        queue="severity",
    )

    return {
        "incident_id": result.incident_id,
        "is_new_incident": result.is_new_incident,
        "similarity_score": result.similarity_score,
        "severity_level": result.severity_level,
        "existing_incident_status": result.existing_incident_status,
        "message": result.message,
    }

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_notifications_task(
    self,
    user_id: int,
    title: str,
    message: str,
    complaint_id: int = None,
    notification_type: str = "info",
    event: str = None,
):

    async def _run():
        async with AsyncSessionLocal() as db:
            notification = Notification(
                user_id=user_id,
                complaint_id=complaint_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channel="sse",
                is_read=False,
                sent_at=datetime.now(timezone.utc),
            )
            db.add(notification)
            await db.commit()
            logger.info(f"Notification saved to DB for user_id={user_id}, complaint_id={complaint_id}")

            await delete_cache(f"user_notifications:{user_id}")
            await sse_manager.send(
                user_id=user_id,
                data={
                    "title": title,
                    "message": message,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "complaint_id": complaint_id,
                    "notification_type": notification_type,
                },
                event=event or notification_type,
            )
            
    run_async(_run())

    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def save_response_task(self, incident_id: int, responder_id: int, actions_taken: str):

    async def _run():
        async with AsyncSessionLocal() as db:

            response = Response(
                incident_id=incident_id,
                responder_id=responder_id,
                actions_taken=actions_taken,
                response_date=datetime.now(timezone.utc),
            )
            db.add(response)
            await db.commit()
            
        return {
            "response_id": response.id,
            "incident_id": incident_id,
            "responder_id": responder_id,
            "actions_taken": actions_taken,
            "response_date": response.response_date.isoformat(),
        }

    try:
        run_async(_run())
    except Exception as e:
        logger.error(f"Response failed: {e}")
        raise self.retry(exc=e)
