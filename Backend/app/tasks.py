import asyncio
from app.utils.template_renderer import render_template
from datetime import datetime
from app.services.sse_manager import sse_manager
import os
from sqlalchemy import func
from app.models.notification import Notification
from app.models.complaint import Complaint
from app.models.attachment import Attachment
from app.models.announcement_media import AnnouncementMedia
from app.models.event_media import EventMedia
from fastapi_mail import FastMail, MessageSchema
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from sqlalchemy.orm import selectinload
from app.models.incident_complaint import IncidentComplaintModel
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import upload_multiple_files_to_cloudinary, delete_from_cloudinary, delete_multiple_from_cloudinary
from app.utils.caching import delete_cache
from app.core.email_config import conf
from sqlalchemy import select
from app.utils.logger import logger
from fastapi import UploadFile
from app.celery_worker import celery_worker
import nest_asyncio
from starlette.datastructures import Headers
from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase
from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.repository.incident_repository import IncidentRepository
from app.domain.infrastracture.llm.gemini_incident_verifier import GeminiIncidentVerifier
from dotenv import load_dotenv

from app.domain.infrastracture.service.chatbot_service import ChatbotService
from app.domain.chatbot.rag_service import RAGService, RAGResponse
from app.domain.IEmbeddingService.vector_store.pinecone_rag_repository import PineconeRAGVectorRepository
from app.domain.infrastracture.llm.gemini_rag import GeminiRAGLanguageModel

nest_asyncio.apply()
load_dotenv()
from app.core.config import settings


_gemini_verifier = None
_embedding_service = None
_vector_repository = None
_severity_calculator = None
_chatbot_service = None

def get_gemini_verifier():
    global _gemini_verifier
    if _gemini_verifier is None:
        _gemini_verifier = GeminiIncidentVerifier(api_key=settings.GEMINI_API_KEY)
    return _gemini_verifier

def get_embedding_service():
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = SentenceTransformerEmbeddingService()
    return _embedding_service

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


def get_chatbot_service():
    global _chatbot_service
    if _chatbot_service is None:
        _chatbot_service = ChatbotService(
            rag_service=RAGService(
                vector_repo=PineconeRAGVectorRepository(
                    api_key=os.environ["PINECONE_API_KEY"],
                    index_name=os.environ["PINECONE_RAG_INDEX_NAME"],
                ),
                language_model=GeminiRAGLanguageModel(api_key=settings.GEMINI_API_KEY),
            ),
            embedding_service=get_embedding_service(),  
        )
    return _chatbot_service

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_email_task(self, subject: str, recipient: str, body: str):
    try:
        async def _send():
            message = MessageSchema(subject=subject, recipients=[recipient], body=body, subtype="html")
            fm = FastMail(conf)
            await fm.send_message(message)
            logger.info(f"Email sent to {recipient} with subject '{subject}'")

        asyncio.run(_send())

    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {str(e)}")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, recipient: str, otp: str, purpose: str):
    subject = f"Your OTP Code for Unified Complaints and Response System (UCRS) {purpose}"
    body = render_template(
        "email_otp.html",
        {
            "otp": otp,
            "purpose": purpose,
        }
    )
    send_email_task.delay(subject=subject, recipient=recipient, body=body)
    
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
    file_objs = []

    try:
        for f in files_data:
            file_obj = open(f["temp_path"], "rb")
            headers = Headers({"content-type": f["content_type"]})
            upload_file = UploadFile(filename=f["filename"], file=file_obj, headers=headers)
            file_objs.append(upload_file)

        urls = asyncio.run(upload_multiple_files_to_cloudinary(file_objs, folder="ucrs/attachments"))
        logger.info(f"Uploaded {len(urls)} attachments to Cloudinary.")

        asyncio.run(_save_attachments_to_db(files_data, urls, complaint_id, uploader_id))

        return urls

    except Exception as e:
        logger.error(f"Failed to upload attachments: {e}")

    finally:
        for f in file_objs:
            try:
                f.file.close()
            except Exception:
                pass

        for f in files_data:
            try:
                if os.path.exists(f["temp_path"]):
                    os.remove(f["temp_path"])
                    logger.info(f"Deleted temporary file: {f['temp_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {f['temp_path']}: {e}")

        try:
            temp_dir = os.path.dirname(files_data[0]["temp_path"])
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to delete temp folder {temp_dir}: {e}")
            
            
async def _save_attachments_to_db(files_data, urls, complaint_id: int, uploader_id: int):
    """
    Save uploaded file metadata to the database
    """
    attachments = []
    async with AsyncSessionLocal() as db:
        for f, url in zip(files_data, urls):
            file_size = os.path.getsize(f["temp_path"])
            attachment = Attachment(
                file_name=f["filename"],
                file_type=f["content_type"],
                file_size=file_size,
                file_path=url,
                uploaded_at=datetime.utcnow(),
                complaint_id=complaint_id,
                uploaded_by=uploader_id
            )
            
            attachments.append(attachment)
            logger.info(f"Prepared attachment for DB: {attachment.file_name}, size: {attachment.file_size} bytes, URL: {attachment.file_path}")
        db.add_all(attachments)
        logger.info(f"Added {len(attachments)} attachments to the database session for complaint_id={complaint_id}")
        await db.commit()
        logger.info(f"Committed attachments to the database for complaint_id={complaint_id}")

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_announcement_media_task(self, files_data, announcement_id: int, uploader_id: int):
    file_objs = []

    try:
        for f in files_data:
            file_obj = open(f["temp_path"], "rb")
            headers = Headers({"content-type": f["content_type"]})
            upload_file = UploadFile(filename=f["filename"], file=file_obj, headers=headers)
            file_objs.append(upload_file)
            logger.info(f"Prepared file object for announcement media: {f['filename']} with content type {f['content_type']}")

        urls = asyncio.run(upload_multiple_files_to_cloudinary(file_objs, folder="ucrs/announcements"))
        
        logger.info(f"Uploaded {len(urls)} announcement media files to Cloudinary.")

        asyncio.run(_save_announcement_media_to_db(files_data, urls, announcement_id))
        logger.info(f"Saved announcement media metadata to database for announcement_id={announcement_id}")
        return urls

    except Exception as e:
        logger.error(f"Failed to upload announcement media: {e}")

    finally:
        for f in file_objs:
            try:
                f.file.close()
            except Exception:
                pass

        for f in files_data:
            try:
                if os.path.exists(f["temp_path"]):
                    os.remove(f["temp_path"])
                    logger.info(f"Deleted temporary file: {f['temp_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {f['temp_path']}: {e}")

        try:
            temp_dir = os.path.dirname(files_data[0]["temp_path"])
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to delete temp folder {temp_dir}: {e}")

async def _save_announcement_media_to_db(files_data, urls, announcement_id: int):
    media_records = []
    async with AsyncSessionLocal() as db:
        for f, url in zip(files_data, urls):
            media_record = AnnouncementMedia(
                announcement_id=announcement_id,
                media_type=f["content_type"].split("/")[0],  # 'image' or 'video'
                media_url=url,
                uploaded_at=datetime.utcnow()
            )
            media_records.append(media_record)
            logger.info(f"Prepared announcement media for DB: {media_record.media_url} of type {media_record.media_type}")
        db.add_all(media_records)
        logger.info(f"Added {len(media_records)} announcement media records to the database session for announcement_id={announcement_id}")
        await db.commit()
        logger.info(f"Committed announcement media records to the database for announcement_id={announcement_id}")   
        
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_event_media_task(self, files_data, event_id: int):
    file_objs = []

    try:
        for f in files_data:
            file_obj = open(f["temp_path"], "rb")
            headers = Headers({"content-type": f["content_type"]})
            upload_file = UploadFile(filename=f["filename"], file=file_obj, headers=headers)
            file_objs.append(upload_file)

        urls = asyncio.run(upload_multiple_files_to_cloudinary(file_objs, folder="ucrs/events"))
        logger.info(f"Uploaded {len(urls)} event media files to Cloudinary.")

        asyncio.run(_save_event_media_to_db(files_data, urls, event_id))
        logger.info(f"Saved event media metadata to database for event_id={event_id}")
        return urls

    except Exception as e:
        logger.error(f"Failed to upload event media: {e}")

    finally:
        for f in file_objs:
            try:
                f.file.close()
            except Exception:
                pass

        for f in files_data:
            try:
                if os.path.exists(f["temp_path"]):
                    os.remove(f["temp_path"])
                    logger.info(f"Deleted temporary file: {f['temp_path']}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {f['temp_path']}: {e}")

        try:
            temp_dir = os.path.dirname(files_data[0]["temp_path"])
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to delete temp folder {temp_dir}: {e}")
            
async def _save_event_media_to_db(files_data, urls, event_id: int):
    media_records = []
    async with AsyncSessionLocal() as db:
        for f, url in zip(files_data, urls):
            media_record = EventMedia(
                event_id=event_id,
                media_type=f["content_type"].split("/")[0],  # 'image' or 'video'
                media_url=url,
                uploaded_at=datetime.utcnow()
            )
            media_records.append(media_record)
            logger.info(f"Prepared event media for DB: {media_record.media_url} of type {media_record.media_type}")
        db.add_all(media_records)
        logger.info(f"Added {len(media_records)} event media records to the database session for event_id={event_id}")
        await db.commit()
        logger.info(f"Committed event media records to the database for event_id={event_id}")         

@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_cloudinary_media_task(self, public_ids):
    
    try:
        if isinstance(public_ids, str):
            public_ids = [public_ids]
        
        if not public_ids:
            logger.warning("delete_cloudinary_media_task called with empty public_ids list")
            return {"success": True, "deleted": 0, "failed": 0}
        
        logger.info(f"Starting deletion of {len(public_ids)} media file(s) from Cloudinary")
        logger.info(f"Public IDs to delete: {public_ids}")
        
        results = asyncio.run(delete_multiple_from_cloudinary(public_ids))
        
        for pid, result in zip(public_ids, results):
            if result:
                logger.info(f"Successfully deleted: {pid}")
            else:
                logger.error(f"Failed to delete: {pid}")
        
        deleted_count = sum(1 for r in results if r)
        failed_count = len(results) - deleted_count
        
        logger.info(f"Cloudinary deletion complete: {deleted_count} deleted, {failed_count} failed")
        
        return {
            "success": failed_count == 0,
            "deleted": deleted_count,
            "failed": failed_count,
            "total": len(public_ids)
        }
        
    except Exception as e:
        logger.error(f"Failed to delete media from Cloudinary: {str(e)}")
        raise self.retry(exc=e)

@celery_worker.task(
    bind=True,
    name="app.tasks.recalculate_severity_task",
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
)
def recalculate_severity_task(self, incident_id: int) -> dict:
    logger.info(f"[recalculate_severity_task] incident_id={incident_id}")

    async def _run():
        async with AsyncSessionLocal() as db:
            incident_repo = IncidentRepository(db)
            velocity_detector = DetectVelocitySpikeUseCase(incident_repo)
            use_case = RecalculateSeverityUseCase(
                incident_repository=incident_repo,
                severity_calculator=get_severity_calculator(),
                velocity_detector=velocity_detector,
            )

            incident = await use_case.execute(incident_id)
            await db.commit()
            return incident

    incident = asyncio.run(_run())

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
                embedding_service=get_embedding_service(),
                vector_repository=get_vector_repository(),
                incident_repository=incident_repo,
                incident_verifier=get_gemini_verifier()
            )
            logger.info(f"[cluster_complaint_task] Executing clustering use case for complaint_id={cluster_data.complaint_id}")

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
            logger.info(f"[cluster_complaint_task] Input DTO prepared for complaint_id={cluster_data.complaint_id}")

            result = await use_case.execute(input_dto)
            logger.info(f"[cluster_complaint_task] Clustering use case completed for complaint_id={cluster_data.complaint_id} with result: {result}")

            if not result.is_new_incident and result.existing_incident_status:
                complaint_result = await db.execute(
                    select(Complaint)
                    .options(selectinload(Complaint.user), selectinload(Complaint.barangay))
                    .where(Complaint.id == cluster_data.complaint_id)
                )
                
                complaint = complaint_result.scalars().first()

                if complaint:
                    # Only update status if not submitted
                    if result.existing_incident_status != "submitted":
                        old_status = complaint.status
                        complaint.status = result.existing_incident_status
                        complaint.updated_at = datetime.utcnow()

                        if result.existing_incident_status in ["forwarded_to_lgu", "forwarded_to_department"] and not complaint.forwarded_at:
                            complaint.forwarded_at = datetime.utcnow()

                        if result.existing_incident_status == "resolved" and not complaint.resolved_at:
                            complaint.resolved_at = datetime.utcnow()

                        logger.info(
                            f"[cluster_complaint_task] Updated complaint {cluster_data.complaint_id} "
                            f"status from '{old_status}' to '{result.existing_incident_status}'"
                        )

                    notification = Notification(
                        user_id=cluster_data.user_id,
                        complaint_id=cluster_data.complaint_id,
                        title="Update on your complaint",
                        message=result.message or f"Your complaint is about the same issue as an existing report. Current status: {result.existing_incident_status.replace('_', ' ')}.",
                        notification_type="info",
                        channel="in_app",
                        is_read=False,
                        sent_at=datetime.utcnow()
                    )
                    db.add(notification)
                    logger.info(f"[cluster_complaint_task] Created notification for user {cluster_data.user_id} about merged incident")

                    await sse_manager.send(
                        user_id=cluster_data.user_id,
                        data={
                            "title": "Update on your complaint",
                            "message": result.message or f"Your complaint is about the same issue as an existing report. Current status: {result.existing_incident_status.replace('_', ' ')}.",
                            "sent_at": datetime.utcnow().isoformat(),
                            "complaint_id": cluster_data.complaint_id,
                            "notification_type": "info",
                        },
                        event="info",
                    )

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
                    logger.info(
                        f"[cluster_complaint_task] Hearing date lookup for incident_id={result.incident_id}, "
                        f"complaint_id={cluster_data.complaint_id}, hearing_date={incident_hearing_date}"
                    )

                    if incident_hearing_date:
                        complaint.hearing_date = incident_hearing_date
                        logger.info(
                            f"[cluster_complaint_task] Applied hearing_date={incident_hearing_date} "
                            f"to complaint_id={cluster_data.complaint_id}"
                        )

                        if incident_hearing_date > datetime.utcnow():
                            logger.info(
                                f"[cluster_complaint_task] Upcoming hearing detected for complaint_id={cluster_data.complaint_id}; "
                                f"sending hearing email task"
                            )
                            user_name = (
                                f"{complaint.user.first_name} {complaint.user.last_name}".strip()
                                if complaint.user else "User"
                            )
                            notify_user_for_hearing_task.delay(
                                recipient=complaint.user.email,
                                barangay_name=complaint.barangay.barangay_name if complaint.barangay else "N/A",
                                compliant_name=user_name or (complaint.user.name if complaint.user else "User"),
                                hearing_day=incident_hearing_date.strftime("%d"),
                                hearing_month=incident_hearing_date.strftime("%B"),
                                hearing_year=incident_hearing_date.strftime("%Y"),
                                issued_day=datetime.utcnow().strftime("%d"),
                                issued_month=datetime.utcnow().strftime("%B"),
                                issued_year=datetime.utcnow().strftime("%Y"),
                                notified_day=datetime.utcnow().strftime("%d"),
                                notified_month=datetime.utcnow().strftime("%B"),
                                notified_year=datetime.utcnow().strftime("%Y"),
                                hearing_time=incident_hearing_date.strftime("%I:%M %p")
                            )
                            logger.info(
                                f"[cluster_complaint_task] notify_user_for_hearing_task queued for "
                                f"complaint_id={cluster_data.complaint_id}, user_id={cluster_data.user_id}"
                            )
                        else:
                            logger.info(
                                f"[cluster_complaint_task] Hearing already completed for complaint_id={cluster_data.complaint_id}; "
                                f"sending in-app hearing update"
                            )
                            current_status = (complaint.status or "submitted").replace("_", " ")
                            hearing_done_message = (
                                f"Your complaint is linked to an issue that already had a hearing on {incident_hearing_date.strftime('%B %d, %Y %I:%M %p')}. "
                                f"Current status: {current_status}."
                            )
                            send_notifications_task.delay(
                                user_id=cluster_data.user_id,
                                title="Hearing update",
                                message=hearing_done_message,
                                complaint_id=cluster_data.complaint_id,
                                notification_type="info"
                            )
                            logger.info(
                                f"[cluster_complaint_task] send_notifications_task queued for "
                                f"complaint_id={cluster_data.complaint_id}, user_id={cluster_data.user_id}"
                            )
                    else:
                        logger.info(
                            f"[cluster_complaint_task] No existing hearing date found for "
                            f"incident_id={result.incident_id}; skipped hearing notifications for complaint_id={cluster_data.complaint_id}"
                        )
                    

            await db.commit()
            return result

    result = asyncio.run(_run())

    async def _cleanup_cache():
        cache_keys = [
            f"complaint:{cluster_data.complaint_id}",
            f"incident_complaints:{result.incident_id}",
            f"incident:{result.incident_id}",
            f"barangay_{cluster_data.barangay_id}_complaints",
            f"barangay_incidents:{cluster_data.barangay_id}",
            f"user_complaints:{cluster_data.user_id}",
            f"user_notifications:{cluster_data.user_id}",
            "all_complaints",
            "all_forwarded_incidents",
            f"weekly_complaint_stats_by_barangay:{cluster_data.barangay_id}",
            f"forwarded_barangay_incidents:{cluster_data.barangay_id}",
            f"forwarded_department_incidents:{cluster_data.barangay_id}",
        ]
        for key in cache_keys:
            await delete_cache(key)

    asyncio.run(_cleanup_cache())

    recalculate_severity_task.apply_async(
        args=[result.incident_id],
        queue="severity",
    )

    if not result.is_new_incident and result.existing_incident_status:
        logger.info(
            f"Complaint merged with existing incident (ID: {result.incident_id}). "
            f"Existing status: {result.existing_incident_status}. "
            f"Message: {result.message}"
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
def send_notifications_task(self, user_id: int, title: str, message: str, complaint_id: int = None, notification_type: str = "info"):
    try:
        notification = Notification(
            user_id=user_id,
            complaint_id=complaint_id,
            title=title,
            message=message,
            notification_type=notification_type,
            channel="sse",
            is_read=False,
            sent_at=datetime.utcnow()
        )
        asyncio.run(_save_notification_to_db(notification))
        logger.info(f"Saved notification to database for user_id={user_id} with title='{title}'")
        
        # Then send SSE event
        asyncio.run(sse_manager.send(
            user_id=user_id,
            data = {
                "title": title,
                "message": message,
                "sent_at": datetime.utcnow().isoformat(),
                "complaint_id": complaint_id,
                "notification_type": notification_type,
            },
            event=notification_type,
        ))
        logger.info(f"Sent SSE notification to user_id={user_id}")
    
    except Exception as e:
        logger.error(f"Failed to send notification to user_id={user_id}: {str(e)}")
        raise self.retry(exc=e)
    
async def _save_notification_to_db(notification: Notification):
    async with AsyncSessionLocal() as db:
        db.add(notification)
        await db.commit()
        await delete_cache(f"user_notifications:{notification.user_id}")
        logger.info(f"Saved notification to database for user_id={notification.user_id} with title='{notification.title}'")