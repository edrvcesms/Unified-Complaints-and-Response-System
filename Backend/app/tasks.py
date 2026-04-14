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
from app.models.response import Response
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
from app.domain.config.embeddings.gemini_embedding_service import GeminiEmbeddingService
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
_gemini_embedding_service = None

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


def get_gemini_embedding_service():
    global _gemini_embedding_service
    if _gemini_embedding_service is None:
       _gemini_embedding_service = GeminiEmbeddingService(api_key=settings.GEMINI_API_KEY)
    return _gemini_embedding_service

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
            embedding_service=get_gemini_embedding_service(),  
        )
    return _chatbot_service


def run_async(coro):
    import asyncio
    try:
        return asyncio.run(coro)
    except RuntimeError:
        # If already in an event loop, fallback (rare in Celery)
        loop = asyncio.get_event_loop()
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
                file_obj = open(f["temp_path"], "rb")
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
                        file_size=os.path.getsize(f["temp_path"]),
                        file_path=url,
                        uploaded_at=datetime.utcnow(),
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
                file_obj = open(f["temp_path"], "rb")
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
                            uploaded_at=datetime.utcnow(),
                        )
                    )

                db.add_all(media_records)
                await db.commit()

            return urls

        finally:
            # Close files
            for f in file_objs:
                try:
                    f.file.close()
                except:
                    pass

            # Delete temp files
            for f in files_data:
                try:
                    if os.path.exists(f["temp_path"]):
                        os.remove(f["temp_path"])
                except:
                    pass

            # Delete temp folder if empty
            try:
                temp_dir = os.path.dirname(files_data[0]["temp_path"])
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
            except:
                pass

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Announcement media upload failed: {e}")
        raise self.retry(exc=e)  
        
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def upload_event_media_task(self, files_data, event_id: int):

    async def _run():
        file_objs = []

        try:
            # Prepare UploadFile objects
            for f in files_data:
                file_obj = open(f["temp_path"], "rb")
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
                            uploaded_at=datetime.utcnow(),
                        )
                    )

                db.add_all(media_records)
                await db.commit()

            return urls

        finally:
            # Close files
            for f in file_objs:
                try:
                    f.file.close()
                except:
                    pass

            # Delete temp files
            for f in files_data:
                try:
                    if os.path.exists(f["temp_path"]):
                        os.remove(f["temp_path"])
                except:
                    pass

            # Delete temp folder if empty
            try:
                temp_dir = os.path.dirname(files_data[0]["temp_path"])
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
            except:
                pass

    try:
        return run_async(_run())
    except Exception as e:
        logger.error(f"Event media upload failed: {e}")
        raise self.retry(exc=e)
    
@celery_worker.task(bind=True, max_retries=3, default_retry_delay=30)
def delete_cloudinary_media_task(self, public_ids):

    async def _run():
        if isinstance(public_ids, str):
            ids = [public_ids]
        else:
            ids = public_ids

        results = await delete_multiple_from_cloudinary(ids)

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
                embedding_service=get_embedding_service(),
                vector_repository=get_vector_repository(),
                incident_repository=incident_repo,
                incident_verifier=get_gemini_verifier()
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
                        complaint.updated_at = datetime.utcnow()

                        if result.existing_incident_status in ["forwarded_to_lgu", "forwarded_to_department"] and not complaint.forwarded_at:
                            complaint.forwarded_at = datetime.utcnow()

                        if result.existing_incident_status == "resolved" and not complaint.resolved_at:
                            complaint.resolved_at = datetime.utcnow()

                    # SAVE NOTIFICATION
                    notification = Notification(
                        user_id=cluster_data.user_id,
                        complaint_id=cluster_data.complaint_id,
                        title="Update on your complaint",
                        message=result.message or f"Your complaint is linked to an existing report. Status: {result.existing_incident_status}",
                        notification_type="info",
                        channel="in_app",
                        is_read=False,
                        sent_at=datetime.utcnow()
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

                        if incident_hearing_date > datetime.utcnow():
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
                                issued_day=datetime.utcnow().strftime("%d"),
                                issued_month=datetime.utcnow().strftime("%B"),
                                issued_year=datetime.utcnow().strftime("%Y"),
                                notified_day=datetime.utcnow().strftime("%d"),
                                notified_month=datetime.utcnow().strftime("%B"),
                                notified_year=datetime.utcnow().strftime("%Y"),
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
def send_notifications_task(self, user_id: int, title: str, message: str, complaint_id: int = None, notification_type: str = "info"):

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
                sent_at=datetime.utcnow(),
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
                    "sent_at": datetime.utcnow().isoformat(),
                    "complaint_id": complaint_id,
                    "notification_type": notification_type,
                },
                event=notification_type,
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
                response_date=datetime.utcnow(),
            )
            db.add(response)
            await db.commit()

    try:
        run_async(_run())
    except Exception as e:
        logger.error(f"Response failed: {e}")
        raise self.retry(exc=e)
