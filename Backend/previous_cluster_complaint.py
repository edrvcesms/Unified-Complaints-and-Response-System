
    


"""
    
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

"""



"""

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

"""