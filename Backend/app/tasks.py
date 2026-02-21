import asyncio
from datetime import datetime
import os
from app.models.attachment import Attachment
from fastapi_mail import FastMail, MessageSchema
from app.database.database import AsyncSessionLocal
from app.utils.cloudinary import upload_multiple_files_to_cloudinary, delete_from_cloudinary
from app.core.email_config import conf
from app.utils.logger import logger
from fastapi import UploadFile
from app.celery_worker import celery_worker
import nest_asyncio
import asyncio
from starlette.datastructures import Headers
import asyncio
import os
import logging
from datetime import datetime

from app.celery_worker import celery_worker
from app.database.database import AsyncSessionLocal

from app.domain.application.use_cases.cluster_complaint import ClusterComplaintUseCase, ClusterComplaintInput
from app.domain.application.use_cases.recalculate_severity import RecalculateSeverityUseCase, WeightedSeverityCalculator
from app.domain.weighted_severity_calculator.detect_velocity_spike import DetectVelocitySpikeUseCase


from app.domain.config.embeddings.sentence_transformer_service import SentenceTransformerEmbeddingService
from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import PineconeVectorRepository
from app.domain.repository.incident_repository import IncidentRepository
from app.dependencies.db_dependency import get_async_db

nest_asyncio.apply()

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
        raise self.retry(exc=e)

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
        db.add_all(attachments)
        await db.commit()
        
        



logger = logging.getLogger(__name__)

# ── Singletons — created once per worker process ──────────────────────────────
# These are stateless so they're safe to share across tasks in the same worker.
_embedding_service = SentenceTransformerEmbeddingService()

_vector_repository = PineconeVectorRepository(
    api_key=os.environ["PINECONE_API_KEY"],
    environment=os.environ.get("PINECONE_ENVIRONMENT", "us-east-1"),
)

_severity_calculator = WeightedSeverityCalculator()


def _run_async(coro):
    """
    Run an async coroutine in a new event loop inside a sync Celery task.
    Each task gets its own loop to avoid event loop conflicts between workers.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_worker.task(
    bind=True,
    name="infrastructure.celery.tasks.cluster_complaint_task",
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(Exception,),
)
def cluster_complaint_task(self, complaint_data: dict) -> dict:
    """
    Celery task: cluster a complaint into an incident.

    Dispatched by the FastAPI route immediately after complaint submission.
    On success, dispatches recalculate_severity_task as a sub-task.
    """
    logger.info(f"[cluster_complaint_task] complaint_id={complaint_data.get('complaint_id')}")

    async def _run():
        async with get_async_db() as db:
            # Build dependencies directly — no container needed
            incident_repo = IncidentRepository(db)
            use_case = ClusterComplaintUseCase(
                embedding_service=_embedding_service,
                vector_repository=_vector_repository,
                incident_repository=incident_repo,
            )

            input_dto = ClusterComplaintInput(
                complaint_id=complaint_data["complaint_id"],
                user_id=complaint_data["user_id"],
                title=complaint_data["title"],
                description=complaint_data["description"],
                barangay_id=complaint_data["barangay_id"],
                category_id=complaint_data["category_id"],
                sector_id=complaint_data.get("sector_id"),
                priority_level_id=complaint_data.get("priority_level_id"),
                category_time_window_hours=complaint_data["category_time_window_hours"],
                category_base_severity_weight=complaint_data["category_base_severity_weight"],
                similarity_threshold=complaint_data["similarity_threshold"],
                created_at=datetime.fromisoformat(complaint_data["created_at"]),
            )

            result = await use_case.execute(input_dto)
            await db.commit()
            return result

    result = _run_async(_run())

    # Dispatch severity recalculation as a follow-up task
    recalculate_severity_task.apply_async(
        args=[result.incident_id],
        queue="severity",
    )

    return {
        "incident_id": result.incident_id,
        "is_new_incident": result.is_new_incident,
        "similarity_score": result.similarity_score,
        "severity_level": result.severity_level,
    }


@celery_worker.task(
    bind=True,
    name="infrastructure.celery.tasks.recalculate_severity_task",
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
)
def recalculate_severity_task(self, incident_id: int) -> dict:
    """
    Celery task: recalculate severity for a given incident.
    Always dispatched after cluster_complaint_task completes.
    Can also be dispatched independently (e.g. on complaint resolution).
    """
    logger.info(f"[recalculate_severity_task] incident_id={incident_id}")

    async def _run():
        async with get_async_db() as db:
            # Build dependencies directly — no container needed
            incident_repo = IncidentRepository(db)
            velocity_detector = DetectVelocitySpikeUseCase(incident_repo)
            use_case = RecalculateSeverityUseCase(
                incident_repository=incident_repo,
                severity_calculator=_severity_calculator,
                velocity_detector=velocity_detector,
            )

            incident = await use_case.execute(incident_id)
            await db.commit()
            return incident

    incident = _run_async(_run())

    return {
        "incident_id": incident.id,
        "severity_score": incident.severity_score,
        "severity_level": incident.severity_level.value,
    }