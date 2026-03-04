import asyncio
from datetime import datetime
from app.services.sse_manager import sse_manager
import os
from app.models.notification import Notification
from app.models.complaint import Complaint
from app.models.attachment import Attachment
from fastapi_mail import FastMail, MessageSchema
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import upload_multiple_files_to_cloudinary, delete_from_cloudinary
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
nest_asyncio.apply()
load_dotenv()
from app.core.config import settings

# Lazy-loaded singletons to avoid heavy initialization on import
_gemini_verifier = None
_embedding_service = None
_vector_repository = None
_severity_calculator = None

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
    body = f"""
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #90ee90;">Your OTP Code for UCRS {purpose}</h2>
        <p style="font-size: 16px; color: #333;">Use the following code to proceed:</p>
        <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #000; letter-spacing: 4px;">
            {otp}
        </div>
        <p style="font-size: 14px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
    </div>
    """
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

        urls = asyncio.run(upload_multiple_files_to_cloudinary(file_objs, folder="attachments"))
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
                description=cluster_data.description,
                barangay_id=cluster_data.barangay_id,
                category_id=cluster_data.category_id,
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
                    select(Complaint).where(Complaint.id == cluster_data.complaint_id)
                )
                complaint = complaint_result.scalars().first()
                
                if complaint and result.existing_incident_status != "submitted":
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
                        title="This complaint is already part of an existing incident",
                        message=result.message or f"Your complaint has been merged with an existing incident that is currently {result.existing_incident_status.replace('_', ' ')}.",
                        notification_type="info",
                        channel="in_app",
                        is_read=False,
                        sent_at=datetime.utcnow()
                    )
                    db.add(notification)
                    logger.info(f"[cluster_complaint_task] Created notification for user {cluster_data.user_id} about merged incident")
            
            await db.commit()
            return result

    result = asyncio.run(_run())
    
    asyncio.run(delete_cache(f"complaint:{cluster_data.complaint_id}"))
    asyncio.run(delete_cache(f"incident_complaints:{result.incident_id}"))
    asyncio.run(delete_cache(f"incident:{result.incident_id}"))
    asyncio.run(delete_cache(f"barangay_{cluster_data.barangay_id}_complaints"))
    asyncio.run(delete_cache(f"barangay_incidents:{cluster_data.barangay_id}"))
    asyncio.run(delete_cache(f"user_complaints:{cluster_data.user_id}"))
    asyncio.run(delete_cache(f"user_notifications:{cluster_data.user_id}"))
    asyncio.run(delete_cache("all_complaints"))
    asyncio.run(delete_cache("all_forwarded_incidents"))
    asyncio.run(delete_cache(f"weekly_complaint_stats_by_barangay:{cluster_data.barangay_id}"))
    asyncio.run(delete_cache(f"forwarded_barangay_incidents:{cluster_data.barangay_id}"))
    asyncio.run(delete_cache(f"forwarded_department_incidents:{cluster_data.barangay_id}"))

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
        # Save to database FIRST before sending SSE
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
            },
            event="notification",
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