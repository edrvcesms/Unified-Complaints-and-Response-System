from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.incident_model import IncidentModel
from app.utils.logger import logger
from app.models.user import User
from app.models.barangay import Barangay
from app.models.category import Category
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.constants.roles import UserRole
from datetime import datetime, timezone
from typing import Optional
from app.utils.caching import set_cache, get_cache

async def get_monthly_report(barangay_id: int, user_id: int, db: AsyncSession, month: Optional[int] = None, year: Optional[int] = None):
  try:
    now = datetime.now(timezone.utc)
    target_month = month if month is not None else now.month
    target_year = year if year is not None else now.year
    
    cache_key = f"monthly_report_by_barangay:{barangay_id}:{target_month}:{target_year}"
    cached_report = await get_cache(cache_key)
    if cached_report:
      logger.info(f"Monthly report for barangay {barangay_id} ({target_month}/{target_year}) retrieved from cache")
      return cached_report
    
    result = await db.execute(select(User).where(User.id == user_id))
    current_user = result.scalar_one_or_none()
    if not current_user:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if current_user.role not in [UserRole.BARANGAY_OFFICIAL, UserRole.LGU_OFFICIAL]:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    barangay_result = await db.execute(select(Barangay).where(Barangay.id == barangay_id))
    barangay = barangay_result.scalar_one_or_none()
    if not barangay:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barangay not found")
    
    if not (1 <= target_month <= 12):
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month. Must be between 1 and 12.")
    if not (2020 <= target_year <= 2100):
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid year.")
    
    start_date = datetime(target_year, target_month, 1)
    
    if target_month == 12:
      end_date = datetime(target_year + 1, 1, 1)
    else:
      end_date = datetime(target_year, target_month + 1, 1)
    
    categories_result = await db.execute(select(Category))
    all_categories = categories_result.scalars().all()
    
    category_summary = {}
    for category in all_categories:
      category_summary[category.category_name] = {
        "incidents": [],
        "total_complaint_count": 0
      }
    
    result = await db.execute(
      select(IncidentModel)
      .options(selectinload(IncidentModel.category))
      .where(
        and_(
          IncidentModel.barangay_id == barangay_id,
          IncidentModel.first_reported_at >= start_date,
          IncidentModel.first_reported_at < end_date
        )
      )
    )
    
    incidents = result.scalars().all()
    
    for incident in incidents:
      category_name = incident.category.category_name if incident.category else None
      
      if category_name and category_name in category_summary:
        category_summary[category_name]["incidents"].append({
          "incident_id": incident.id,
          "incident_title": incident.title,
          "complaint_count": incident.complaint_count,
          "first_reported_at": incident.first_reported_at.isoformat() if incident.first_reported_at else None,
          "last_reported_at": incident.last_reported_at.isoformat() if incident.last_reported_at else None
        })
        category_summary[category_name]["total_complaint_count"] += incident.complaint_count

    report_data = []
    for category_name, summary in category_summary.items():
      report_data.append({
        "category": category_name,
        "total_incidents": len(summary["incidents"]),
        "incidents": summary["incidents"],
        "total_complaint_count": summary["total_complaint_count"]
      })

    report = {
      "barangay": {
        "id": barangay.id,
        "name": barangay.barangay_name,
        "address": barangay.barangay_address,
        "contact_number": barangay.barangay_contact_number,
        "email": barangay.barangay_email,
      },
      "report_period": {
        "month": target_month,
        "year": target_year,
        "month_name": start_date.strftime("%B"),
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat()
      },
      "data": report_data
    }
    
    await set_cache(cache_key, report, expiration=3600)
    logger.info(f"Monthly report for barangay {barangay_id} ({target_month}/{target_year}) retrieved from database and cached")
    
    return report
  
  except HTTPException:
    raise
  
  except Exception as e:
    logger.error(f"Error generating monthly report for barangay ID {barangay_id}: {str(e)}")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while generating the report.")