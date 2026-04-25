from typing import List, Optional

from fastapi import HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.response_schema import ResponseCreateSchema
from app.models.incident_model import IncidentModel
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from app.constants.complaint_status import ComplaintStatus
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.utils.cache_invalidator_optimized import invalidate_cache
from app.tasks import send_notifications_task, send_push_notification_task
from app.models.response import Response
from app.services.attachment_services import enqueue_response_attachments
from app.services.complaint_services import log_status_change
from fastapi.responses import JSONResponse
from app.utils.logger import logger
from app.constants.roles import UserRole
from datetime import datetime, timezone

async def review_complaints_by_incident(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, attachments: Optional[List[UploadFile]], db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()
        
        if not complaint_ids:
            return {"message": "No complaints found for this incident"}

        complaints = await db.execute(
            select(Complaint)
            .options(selectinload(Complaint.barangay_account).selectinload(BarangayAccount.user))
            .where(Complaint.id.in_(complaint_ids))
        )
        complaints = complaints.scalars().all()
        result = await db.execute(select(User).where(User.id == responder_id))
        reviewer = result.scalars().first()
        for complaint in complaints:
            if complaint.status in [ComplaintStatus.REVIEWED_BY_BARANGAY.value, ComplaintStatus.REVIEWED_BY_DEPARTMENT.value, ComplaintStatus.REVIEWED_BY_LGU.value]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="This incident is already under review"
                )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.REVIEWED_BY_BARANGAY.value if reviewer.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.REVIEWED_BY_DEPARTMENT.value if reviewer.role == UserRole.DEPARTMENT_STAFF else ComplaintStatus.REVIEWED_BY_LGU.value)
        )
        
        await log_status_change(
            complaint_ids=complaint_ids,
            new_status=ComplaintStatus.REVIEWED_BY_BARANGAY.value if reviewer.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.REVIEWED_BY_DEPARTMENT.value if reviewer.role == UserRole.DEPARTMENT_STAFF else ComplaintStatus.REVIEWED_BY_LGU.value,
            changed_by_user_id=responder_id,
            db=db
        )

        await db.commit()
        
        response = Response(
            incident_id=incident_id,
            responder_id=responder_id,
            actions_taken=response_data.actions_taken,
            response_date=datetime.now(timezone.utc),
        )
        db.add(response)
        await db.commit()
        await db.refresh(response)

        if attachments:
            await enqueue_response_attachments(attachments, response.id, responder_id)

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None
        
        for complaint_id in complaint_ids:
            result = await db.execute(
                select(Complaint, User)
                .join(User, User.id == Complaint.user_id)
                .where(Complaint.id == complaint_id)
            )
            row = result.first()
            if row:
                complaint, complaint_user = row
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title=complaint.title,
                    message=f"Your complaint about '{complaint.title}' is now under review",
                    complaint_id=complaint.id,
                    notification_type="complaint_under_review"
                )
                send_push_notification_task.delay(
                    token=complaint_user.push_token,
                    enabled=complaint_user.push_notifications_enabled,
                    title=complaint.title,
                    body=f"Your complaint about '{complaint.title}' is now under review",
                    data={"complaint_id": complaint.id, "notification_type": "complaint_under_review"},
                )
                
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in complaints],
            barangay_id=barangay_id,
            incident_ids=[incident_id],
            department_account_id=department_account_id,
            include_global=True
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident are now under review"}
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def resolve_complaints_by_incident(response_data: ResponseCreateSchema, incident_id: int, responder_id: int, attachments: Optional[List[UploadFile]], db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()
        result = await db.execute(select(User).where(User.id == responder_id))
        resolver = result.scalars().first()

        if not complaint_ids:
            return {"message": "No complaints found for this incident"}

        complaints = await db.execute(
            select(Complaint)
            .options(selectinload(Complaint.barangay_account).selectinload(BarangayAccount.user))
            .where(Complaint.id.in_(complaint_ids))
        )
        complaints = complaints.scalars().all()
        for complaint in complaints:
            if complaint.status in [ComplaintStatus.RESOLVED_BY_BARANGAY.value, ComplaintStatus.RESOLVED_BY_DEPARTMENT.value, ComplaintStatus.RESOLVED_BY_LGU.value]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This incident is already resolved"
                )
                
        await db.execute(
            update(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .values(resolver_id=responder_id)
        )

        await db.execute(
            update(Complaint)
            .where(Complaint.id.in_(complaint_ids))
            .values(status=ComplaintStatus.RESOLVED_BY_BARANGAY.value if resolver.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.RESOLVED_BY_DEPARTMENT.value if resolver.role == UserRole.DEPARTMENT_STAFF else ComplaintStatus.RESOLVED_BY_LGU.value, resolved_at=datetime.now(timezone.utc))
        )
        
        await log_status_change(
            complaint_ids=complaint_ids,
            new_status=ComplaintStatus.RESOLVED_BY_BARANGAY.value if resolver.role == UserRole.BARANGAY_OFFICIAL else ComplaintStatus.RESOLVED_BY_DEPARTMENT.value if resolver.role == UserRole.DEPARTMENT_STAFF else ComplaintStatus.RESOLVED_BY_LGU.value,
            changed_by_user_id=responder_id,
            db=db
        )
            
        await db.commit()
    
        response = Response(
            incident_id=incident_id,
            responder_id=responder_id,
            actions_taken=response_data.actions_taken,
            response_date=datetime.now(timezone.utc),
        )
        db.add(response)
        await db.commit()
        await db.refresh(response)

        if attachments:
            await enqueue_response_attachments(attachments, response.id, responder_id)

        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None
        
        for complaint_id in complaint_ids:
            result = await db.execute(
                select(Complaint)
                .options(selectinload(Complaint.user))
                .where(Complaint.id == complaint_id)
            )
            complaint = result.scalars().first()
            if complaint and complaint.user:
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title=complaint.title,
                    message=f"Your complaint '{complaint.title}' has been resolved",
                    complaint_id=complaint.id,
                    notification_type="success"
                )
                send_push_notification_task.delay(
                    token=complaint.user.push_token,
                    enabled=complaint.user.push_notifications_enabled,
                    title="Complaint Resolved",
                    body=f"Your complaint regarding on '{complaint.title}' has been resolved.",
                    data={"complaint_id": complaint.id}
                )

                
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in complaints],
            barangay_id=barangay_id,
            incident_ids=[incident_id],
            department_account_id=department_account_id,
            include_global=True
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been resolved"}
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    


async def reject_complaints_by_incident(incident_id: int, rejector_id: int, response_data: ResponseCreateSchema, attachments: Optional[List[UploadFile]], db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        complaint_ids = result.scalars().all()
        result = await db.execute(select(User).where(User.id == rejector_id))
        rejector = result.scalars().first()
        rejected_by = rejector.role.replace("_", " ").title()
        
        if not complaint_ids:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No complaints found for this incident")
        
        complaints = await db.execute(
            select(Complaint)
            .options(selectinload(Complaint.barangay_account).selectinload(BarangayAccount.user))
            .where(Complaint.id.in_(complaint_ids))
        )
        complaints = complaints.scalars().all()
        
        
        if rejector.role == UserRole.LGU_OFFICIAL:
            notification_type = "rejected_by_lgu"
        elif rejector.role == UserRole.DEPARTMENT_STAFF:
           notification_type = "rejected_by_department"
        else:
           notification_type = "rejected_by_barangay"
        
        if rejector.role in [UserRole.DEPARTMENT_STAFF, UserRole.LGU_OFFICIAL]:

            for complaint in complaints:
                if complaint.is_rejected_by_lgu:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This incident has already been rejected by the LGU")
                if complaint.is_rejected_by_department:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This incident has already been rejected by the department")

        if rejector.role == UserRole.LGU_OFFICIAL:
            await db.execute(
                update(Complaint)
                .where(Complaint.id.in_(complaint_ids))
                .values(is_rejected_by_lgu=True, status=ComplaintStatus.SUBMITTED.value)
            )
            await log_status_change(
                complaint_ids=complaint_ids,
                new_status=ComplaintStatus.SUBMITTED.value,
                changed_by_user_id=rejector_id,
                db=db
            )
            send_notifications_task.delay(
                user_id=complaints[0].barangay_account.user_id if complaints and complaints[0].barangay_account and complaints[0].barangay_account.user_id else None,
                title="The LGU has rejected the complaints under this incident",
                message=f"The LGU has rejected the complaints under the incident you forwarded '{complaints[0].title if complaints else 'N/A'}'.",
                complaint_id=complaints[0].id if complaints else None,
                notification_type=notification_type,
                event="reject"
            )
        elif rejector.role == UserRole.DEPARTMENT_STAFF:
            await db.execute(
                update(Complaint)
                .where(Complaint.id.in_(complaint_ids))
                .values(
                    is_rejected_by_department=True,
                    status=ComplaintStatus.FORWARDED_TO_LGU.value,
                    forwarded_at=datetime.now(timezone.utc)
                )
            )
            await log_status_change(
                complaint_ids=complaint_ids,
                new_status=ComplaintStatus.FORWARDED_TO_LGU.value,
                changed_by_user_id=rejector_id,
                db=db
            )
            lgu = await db.execute(
                select(User).where(User.role == UserRole.LGU_OFFICIAL)
                )
            lgu = lgu.scalars().first()
            logger.info(f"LGU user found for notification: {lgu.id if lgu else 'No LGU user found'}")
            send_notifications_task.delay(
                user_id=lgu.id if lgu else None,
                title="The department has rejected the complaints under this incident",
                message=f"The department has rejected the complaints under the incident '{complaints[0].title if complaints else 'N/A'}' and forwarded it back to the LGU.",
                complaint_id=complaints[0].id if complaints else None,
                notification_type=notification_type,
                event="reject"
            )
            
        else:
            await db.execute(
                update(Complaint)
                .where(Complaint.id.in_(complaint_ids))
                .values(status=ComplaintStatus.REJECTED.value)
            )
            await log_status_change(
                complaint_ids=complaint_ids,
                new_status=ComplaintStatus.REJECTED.value,
                changed_by_user_id=rejector_id,
                db=db
            )
        
        response = Response(
            incident_id=incident_id,
            responder_id=rejector_id,
            actions_taken=response_data.actions_taken,
            response_date=datetime.now(timezone.utc),
        )
        db.add(response)
        await db.commit()
        await db.refresh(response)

        if attachments:
            await enqueue_response_attachments(attachments, response.id, rejector_id)
        
        first_complaint = complaints[0] if complaints else None
        barangay_id = first_complaint.barangay_id if first_complaint else None
        department_account_id = first_complaint.department_account_id if first_complaint else None
            
        for complaint_id in complaint_ids:
            result = await db.execute(
                select(Complaint)
                .options(selectinload(Complaint.user))
                .where(Complaint.id == complaint_id)
            )
            complaint = result.scalars().first()
            if complaint and complaint.user:
                send_notifications_task.delay(
                    user_id=complaint.user_id,
                    title=complaint.title,
                    message=f"Your complaint regarding on '{complaint.title}' has been rejected by the {rejected_by} due to insufficient information or other reasons. Please review the details and consider resubmitting a new complaint.",
                    complaint_id=complaint.id,
                    notification_type=notification_type
                )
                send_push_notification_task.delay(
                    token=complaint.user.push_token,
                    enabled=complaint.user.push_notifications_enabled,
                    title="Complaint Rejected",
                    body=f"Your complaint regarding '{complaint.title}' has been rejected by the {rejected_by}.",
                    data={"complaint_id": complaint.id}
                )
            
        await invalidate_cache(
            complaint_ids=complaint_ids,
            user_ids=[complaint.user_id for complaint in complaints],
            barangay_id=barangay_id,
            incident_ids=[incident_id],
            department_account_id=department_account_id,
            include_global=True
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "All complaints under this incident have been rejected"}
        )
        
    except HTTPException:
        raise
        
    
    except Exception as e:
        logger.exception(
            "Error in reject_complaints_by_incident",
            extra={
                "incident_id": incident_id,
                "rejector_id": rejector_id,
                "complaint_ids": complaint_ids if "complaint_ids" in locals() else None,
            },
        )
        await db.rollback()
        logger.error(f"Error in reject_complaints_by_incident: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))