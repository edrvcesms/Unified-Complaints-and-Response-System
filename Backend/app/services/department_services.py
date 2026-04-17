from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession 
from app.constants.complaint_status import ComplaintStatus
from app.models.complaint import Complaint
from app.models.incident_complaint import IncidentComplaintModel
from app.schemas.incident_schema import IncidentData
from app.models.department import Department
from app.models.department_account import DepartmentAccount
from app.models.incident_model import IncidentModel
from app.schemas.department_schema import DepartmentWithUserData
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.utils.logger import logger
from datetime import datetime, timedelta
from app.utils.caching import set_cache, get_cache, delete_cache
from app.models.response import Response


async def get_all_departments(db: AsyncSession):
    try:
        result = await db.execute(select(Department).options(selectinload(Department.department_account).selectinload(DepartmentAccount.user)))
        departments = result.scalars().all()
        return [DepartmentWithUserData.model_validate(dept, from_attributes=True) for dept in departments]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_all_departments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def get_department_account(user_id: int, db: AsyncSession) -> DepartmentWithUserData:
    try:
      result = await db.execute(
          select(Department)
          .options(
              selectinload(Department.department_account).selectinload(DepartmentAccount.user)
          )
          .where(Department.department_account.has(DepartmentAccount.user_id == user_id))
      )
      
      logger.info(f"Executed query to get department with user ID: {user_id}")
    
      department = result.scalars().first()
      
      logger.info(f"Fetched department with ID: {department.id if department else 'None'}")
      
      if not department:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
      department_with_user_data = DepartmentWithUserData.model_validate(department, from_attributes=True)
      logger.info(f"Department profile for user ID {user_id} retrieved from database")
      return department_with_user_data
    
    except HTTPException:
        raise
      
    except Exception as e:
        logger.error(f"Error in get_department_account: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
  
async def get_department_forwarded_incidents(department_account_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentModel)
            .join(IncidentModel.complaint_clusters)
            .join(IncidentComplaintModel.complaint)
            .where(
                IncidentModel.department_account_id == department_account_id,
                IncidentComplaintModel.complaint.has(Complaint.status.in_([
                    ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
                    ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
                    ComplaintStatus.RESOLVED_BY_DEPARTMENT.value
                ]))
            )
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
            .distinct()
            .order_by(IncidentModel.first_reported_at.asc())
        )
        logger.info(f"Executed query to get forwarded incidents for department account ID: {department_account_id}")
        
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} forwarded incidents for department account ID: {department_account_id}")
        return [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
      
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_department_forwarded_incidents: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

async def forwarded_dept_incident_by_barangay(department_account_id: int, barangay_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(IncidentModel)
            .join(IncidentModel.complaint_clusters)
            .join(IncidentComplaintModel.complaint)
            .where(
                IncidentModel.department_account_id == department_account_id,
                IncidentModel.barangay_id == barangay_id,
                IncidentComplaintModel.complaint.has(Complaint.status.in_([
                    ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
                    ComplaintStatus.REVIEWED_BY_DEPARTMENT.value,
                    ComplaintStatus.RESOLVED_BY_DEPARTMENT.value
                ]))
            )
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters).selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                    .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
            .distinct()
            .order_by(IncidentModel.first_reported_at.asc())
        )
        logger.info(f"Executed query to get forwarded incidents for department account ID: {department_account_id} and barangay ID: {barangay_id}")
        
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} forwarded incidents for department account ID: {department_account_id} and barangay ID: {barangay_id}")
        
        return [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in forwarded_dept_incident_by_barangay: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def weekly_forwarded_incidents_stats(department_account_id: int, db: AsyncSession):
    try:
        today = datetime.now().date()
        week_ago = today - timedelta(days=6)
        
        result = await db.execute(
            select(
                func.date(Complaint.created_at).label('date'),
                Complaint.status,
                func.count(Complaint.id).label('count')
            )
            .join(IncidentComplaintModel, IncidentComplaintModel.complaint_id == Complaint.id)
            .join(IncidentModel, IncidentModel.id == IncidentComplaintModel.incident_id)
            .where(
                func.date(Complaint.created_at) >= week_ago,
                IncidentModel.department_account_id == department_account_id,
                Complaint.status.in_([
                    ComplaintStatus.FORWARDED_TO_DEPARTMENT.value,
                    ComplaintStatus.RESOLVED_BY_DEPARTMENT.value
                ])
            )
            .group_by(func.date(Complaint.created_at), Complaint.status)
        )
        
        stats = result.all()
        
        daily_counts = {}
        for stat in stats:
            date_str = stat.date.isoformat()
            if date_str not in daily_counts:
                daily_counts[date_str] = {"forwarded": 0, "resolved": 0}
            
            if stat.status == ComplaintStatus.FORWARDED_TO_DEPARTMENT.value:
                daily_counts[date_str]["forwarded"] = stat.count
            elif stat.status == ComplaintStatus.RESOLVED_BY_DEPARTMENT.value:
                daily_counts[date_str]["resolved"] = stat.count
        
        return {"daily_counts": daily_counts}
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in weekly_forwarded_incidents_stats: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

  
async def get_incidents_forwarded_to_department(department_account_id: int, db: AsyncSession):
    try:
        department_incidents = await get_cache(f"department_incidents:{department_account_id}")
        if department_incidents is not None:
            logger.info(f"Cache hit for department account ID: {department_account_id}")
            return [IncidentData.model_validate_json(incident) if isinstance(incident, str) else IncidentData.model_validate(incident, from_attributes=True) for incident in department_incidents]
        
        result = await db.execute(
            select(IncidentModel)
            .where(IncidentModel.department_account_id == department_account_id)
            .options(
                selectinload(IncidentModel.category),
                selectinload(IncidentModel.barangay),
                selectinload(IncidentModel.responses).selectinload(Response.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.attachment),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.incident_links),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.complaint)
                        .selectinload(Complaint.user),
                selectinload(IncidentModel.complaint_clusters)
                    .selectinload(IncidentComplaintModel.incident),
            )
            .order_by(IncidentModel.first_reported_at.asc())
        )
        
        incidents = result.scalars().all()
        logger.info(f"Found {len(incidents)} incidents forwarded to department account ID: {department_account_id}")
        incidents_data = [IncidentData.model_validate(incident, from_attributes=True) for incident in incidents]
        await set_cache(f"department_incidents:{department_account_id}", incidents_data, expiration=3600)
        return incidents_data
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in get_incidents_forwarded_to_department: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
