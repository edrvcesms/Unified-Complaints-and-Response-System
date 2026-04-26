from datetime import datetime, timezone
import os
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from app.models.notification import Notification
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel

from app.database.database import AsyncSessionLocal

from app.utils.caching import delete_cache
from app.utils.cache_invalidator_optimized import invalidate_cache
from app.utils.logger import logger

from app.celery_worker import celery_worker

from app.domain.application.use_cases.cluster_complaint import (
    ClusterComplaintUseCase,
    ClusterComplaintInput,
)
from app.domain.application.use_cases.recalculate_severity import (
    RecalculateSeverityUseCase,
    WeightedSeverityCalculator,
)
from app.domain.weighted_severity_calculator.detect_velocity_spike import (
    DetectVelocitySpikeUseCase,
)
from app.domain.repository.incident_repository import IncidentRepository

from app.domain.IEmbeddingService.vector_store.pinecone_vector_repository import (
    PineconeVectorRepository,
)
from app.domain.infrastracture.llm.openai_incident_verifier import (
    OpenAIIncidentVerifier,
)
from app.domain.config.embeddings.openai_embedding import OpenAIEmbeddingService

from app.tasks.notification_tasks import send_notifications_task
from app.tasks.email_tasks import notify_user_for_hearing_task
from app.tasks.worker_loop import run_async, get_worker_loop

from app.core.config import settings
from app.schemas.cluster_complaint_schema import ClusterComplaintSchema

from app.domain.infrastracture.jobs.incident_jobs import (
    run_resolve_expired_incidents,
)
from app.domain.infrastracture.jobs.incident_expiration_alert import (
    run_expiry_warning_notifications,
)

import resend

resend.api_key = settings.RESEND_API_KEY


_severity_calculator = None


def get_openai_incident_verifier():
    return OpenAIIncidentVerifier(
        api_key=settings.OPEN_AI_API_KEY
    )


def get_openai_embedding_service():
    return OpenAIEmbeddingService(
        api_key=settings.OPEN_AI_API_KEY
    )


def get_vector_repository():
    return PineconeVectorRepository(
        api_key=settings.PINECONE_API_KEY,
        environment=settings.PINECONE_ENVIRONMENT,
    )


def get_severity_calculator():
    global _severity_calculator
    if _severity_calculator is None:
        _severity_calculator = WeightedSeverityCalculator()
    return _severity_calculator


@celery_worker.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.tasks.incident_tasks.resolve_expired_incidents_task",
)
def resolve_expired_incidents_task(self):
    try:
        run_async(run_resolve_expired_incidents())
        logger.info("Resolved expired incidents successfully.")
    except Exception as e:
        logger.exception("Resolve expired incidents failed")
        raise self.retry(exc=e)


@celery_worker.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.tasks.incident_tasks.expiry_warning_notifications_task",
)
def expiry_warning_notifications_task(self):
    try:
        run_async(run_expiry_warning_notifications())
        logger.info("Expiry warning notifications sent successfully.")
    except Exception as e:
        logger.exception("Expiry warning notifications failed")
        raise self.retry(exc=e)


@celery_worker.task(bind=True, max_retries=3, default_retry_delay=5)
def recalculate_severity_task(self, incident_id: int):

    async def _run():
        try:
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
        except Exception as e:
            await db.rollback()
            logger.exception(f"Recalculate severity failed for incident_id={incident_id}: {e}")
            raise e

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
    logger.info(f"[cluster] complaint_id={cluster_data.complaint_id}")

    async def _run():
        async with AsyncSessionLocal() as db:

            incident_repo = IncidentRepository(db)

            use_case = ClusterComplaintUseCase(
                embedding_service=get_openai_embedding_service(),
                vector_repository=get_vector_repository(),
                incident_repository=incident_repo,
                incident_verifier=get_openai_incident_verifier(),
            )

            input_dto = ClusterComplaintInput(**cluster_data.model_dump())
            result = await use_case.execute(input_dto)

            barangay_notification_payload = None
            hearing_email_payload = None
            hearing_notification_payload = None

            if result.is_new_incident:
                complaint_for_barangay_notification = (
                    await db.execute(
                        select(Complaint)
                        .options(selectinload(Complaint.barangay_account))
                        .where(Complaint.id == cluster_data.complaint_id)
                    )
                ).scalars().first()

                if (
                    complaint_for_barangay_notification
                    and complaint_for_barangay_notification.barangay_account
                    and complaint_for_barangay_notification.barangay_account.user_id
                ):
                    barangay_notification_payload = {
                        "user_id": complaint_for_barangay_notification.barangay_account.user_id,
                        "title": "New Complaint Submitted",
                        "message": f"New complaint has been submitted to your barangay",
                        "complaint_id": cluster_data.complaint_id,
                        "incident_id": result.incident_id,
                        "notification_type": "info",
                        "event": "new_incident",
                    }

            if not result.is_new_incident and result.existing_incident_status:

                complaint_result = await db.execute(
                    select(Complaint)
                    .options(
                        selectinload(Complaint.barangay_account),
                        selectinload(Complaint.user),
                        selectinload(Complaint.barangay),
                    )
                    .where(Complaint.id == cluster_data.complaint_id)
                )

                complaint = complaint_result.scalars().first()

                if (complaint and complaint.barangay_account and complaint.barangay_account.user_id):

                    barangay_notification_payload = {
                        "user_id": complaint.barangay_account.user_id,
                        "title": "Incident Update",
                        "message": f"A new complaint has been submitted similar to an existing incident.",
                        "complaint_id": complaint.id,
                        "incident_id": result.incident_id,
                        "notification_type": "info",
                        "event": "new_complaint",
                    }

                if complaint:

                    if result.existing_incident_status != "submitted":
                        complaint.status = result.existing_incident_status
                        complaint.updated_at = datetime.now(timezone.utc)

                        if result.existing_incident_status in [
                            "forwarded_to_lgu",
                            "forwarded_to_department",
                        ] and not complaint.forwarded_at:
                            complaint.forwarded_at = datetime.now(timezone.utc)

                        if result.existing_incident_status == "resolved" and not complaint.resolved_at:
                            complaint.resolved_at = datetime.now(timezone.utc)

                    db.add(Notification(
                        user_id=cluster_data.user_id,
                        complaint_id=cluster_data.complaint_id,
                        title="Update on your complaint",
                        message=result.message or f"Status: {result.existing_incident_status}",
                        notification_type="info",
                        channel="in_app",
                        is_read=False,
                        sent_at=datetime.now(timezone.utc),
                    ))

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

                            hearing_email_payload = {
                                "recipient": complaint.user.email,
                                "barangay_name": complaint.barangay.barangay_name if complaint.barangay else "N/A",
                                "compliant_name": user_name,
                                "hearing_day": incident_hearing_date.strftime("%d"),
                                "hearing_month": incident_hearing_date.strftime("%B"),
                                "hearing_year": incident_hearing_date.strftime("%Y"),
                                "issued_day": datetime.now(timezone.utc).strftime("%d"),
                                "issued_month": datetime.now(timezone.utc).strftime("%B"),
                                "issued_year": datetime.now(timezone.utc).strftime("%Y"),
                                "notified_day": datetime.now(timezone.utc).strftime("%d"),
                                "notified_month": datetime.now(timezone.utc).strftime("%B"),
                                "notified_year": datetime.now(timezone.utc).strftime("%Y"),
                                "hearing_time": incident_hearing_date.strftime("%I:%M %p"),
                            }

                        else:
                            hearing_notification_payload = {
                                "user_id": cluster_data.user_id,
                                "title": "Hearing update",
                                "message": f"Hearing already happened on {incident_hearing_date}",
                                "complaint_id": cluster_data.complaint_id,
                                "incident_id": result.incident_id,
                                "notification_type": "info",
                                "channel": "in_app",
                            }

            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.exception(f"Database commit failed: {e}")
                raise e

            try:
                await invalidate_cache(
                    complaint_ids=[cluster_data.complaint_id],
                    user_ids=[cluster_data.user_id],
                    barangay_id=cluster_data.barangay_id,
                    incident_ids=[result.incident_id],
                    include_global=True,
                )
            except Exception as e:
                logger.warning(f"Cache invalidation failed: {e}")

            for k in [
                f"complaint:{cluster_data.complaint_id}",
                f"incident:{result.incident_id}",
                f"user_notifications:{cluster_data.user_id}",
            ]:
                try:
                    await delete_cache(k)
                except Exception as e:
                    logger.warning(f"Cache delete failed for {k}: {e}")

            return {
                "result": result,
                "barangay_notification_payload": barangay_notification_payload,
                "hearing_email_payload": hearing_email_payload,
                "hearing_notification_payload": hearing_notification_payload,
            }

    output = run_async(_run())

    result = output["result"]

    if output["barangay_notification_payload"]:
        send_notifications_task.delay(**output["barangay_notification_payload"])

    if output["hearing_email_payload"]:
        notify_user_for_hearing_task.delay(**output["hearing_email_payload"])

    if output["hearing_notification_payload"]:
        send_notifications_task.delay(**output["hearing_notification_payload"])

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