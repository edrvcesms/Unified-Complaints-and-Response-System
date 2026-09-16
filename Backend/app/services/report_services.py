from io import BytesIO
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, case, func, select
from app.models.incident_model import IncidentModel
from app.utils.logger import logger
from app.models.user import User
from app.models.barangay import Barangay
from app.models.category import Category
from app.models.complaint import Complaint
from app.constants.complaint_status import ComplaintStatus
from app.constants.roles import UserRole
from app.schemas.report_schema import ComplaintReportRequest
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import selectinload
from typing import Optional
from app.utils.caching import set_cache, get_cache


APP_TIMEZONE = ZoneInfo("Asia/Manila")


def _format_report_date(value):
  return f"{value.strftime('%B')} {value.day}, {value.year}"


def _display_category_name(category_name):
  return str(category_name).replace("_", " ").replace("-", " ").title()


def _status_group_expression():
  return case(
    (Complaint.status.in_([
      ComplaintStatus.RESOLVED_BY_BARANGAY.value,
      ComplaintStatus.RESOLVED_BY_LGU.value,
    ]), "resolved"),
    (Complaint.status == ComplaintStatus.FORWARDED_TO_LGU.value, "escalated"),
    (Complaint.status == ComplaintStatus.REJECTED.value, "rejected"),
    (Complaint.status.in_([
      ComplaintStatus.SUBMITTED.value,
      ComplaintStatus.REVIEWED_BY_BARANGAY.value,
      ComplaintStatus.REVIEWED_BY_LGU.value,
    ]), "under_review"),
    else_="under_review",
  )


def _report_styles():
  styles = getSampleStyleSheet()
  return {
    "body": ParagraphStyle("ReportBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, spaceAfter=2),
    "small": ParagraphStyle("ReportSmall", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=8),
    "header": ParagraphStyle("ReportHeader", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=13, alignment=TA_CENTER),
    "title": ParagraphStyle("ReportTitle", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=13, leading=16, alignment=TA_CENTER, spaceAfter=4),
    "section": ParagraphStyle("ReportSection", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10, leading=12, spaceBefore=8, spaceAfter=5),
    "table": ParagraphStyle("ReportTable", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=8, alignment=TA_LEFT),
    "table_center": ParagraphStyle("ReportTableCenter", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=8, alignment=TA_CENTER),
    "table_right": ParagraphStyle("ReportTableRight", parent=styles["BodyText"], fontName="Helvetica", fontSize=7, leading=8, alignment=TA_RIGHT),
  }


def _p(value, style):
  return Paragraph(str(value), style)


def _draw_page(canvas, document):
  canvas.saveState()
  canvas.setFont("Helvetica", 7)
  canvas.drawString(18 * mm, 10 * mm, "Complaints and Feedback Management System")
  canvas.drawRightString(285 * mm, 10 * mm, f"Page {canvas.getPageNumber()}")
  canvas.restoreState()


def _build_complaint_report_pdf(report: dict) -> bytes:
  styles = _report_styles()
  output = BytesIO()
  document = BaseDocTemplate(
    output,
    pagesize=landscape(A4),
    leftMargin=14 * mm,
    rightMargin=14 * mm,
    topMargin=14 * mm,
    bottomMargin=16 * mm,
    title="General Ov",
    author="Complaints and Feedback Management System",
  )
  frame = Frame(document.leftMargin, document.bottomMargin, document.width, document.height, id="normal")
  document.addPageTemplates([PageTemplate(id="report", frames=frame, onPage=_draw_page)])

  story = [
    _p("REPUBLIC OF THE PHILIPPINES", styles["header"]),
    _p("MUNICIPALITY OF SANTA MARIA", styles["header"]),
    _p("PROVINCE OF LAGUNA", styles["header"]),
    Spacer(1, 5 * mm),
    _p("COMPLAINTS AND FEEDBACK MANAGEMENT SYSEM", styles["header"]),
    _p("OVERALL REPORT", styles["title"]),
    _p(f"Reporting Period: {report['period_label']}", styles["body"]),
    _p(f"Date Generated: {report['generated_label']}", styles["body"]),
    Spacer(1, 4 * mm),
    _p("I. EXECUTIVE SUMMARY", styles["section"]),
  ]

  summary_rows = [[_p("COMPLAINT STATISTICS", styles["table"]), _p("TOTAL", styles["table_center"])]]
  for label, key in [
    ("Total Complaints Received", "total"),
    ("Resolved", "resolved"),
    ("Under Review", "under_review"),
    ("Escalated", "escalated"),
    ("Rejected", "rejected"),
  ]:
    summary_rows.append([_p(label, styles["table"]), _p(report["summary"][key], styles["table_right"])])
  summary = Table(summary_rows, colWidths=[110 * mm, 35 * mm], repeatRows=1)
  summary.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.4, colors.black),
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2F3")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
  ]))
  story.append(summary)
  story.append(_p("II. DISTRIBUTION OF COMPLAINTS BY BARANGAY", styles["section"]))

  status_headers = ["No.", "Barangay", "Total", "Resolved", "Under Review", "Escalated", "Rejected"]
  distribution_rows = [[_p(value, styles["table_center"] if index != 1 else styles["table"]) for index, value in enumerate(status_headers)]]
  for index, row in enumerate(report["barangays"], 1):
    distribution_rows.append([_p(index, styles["table_center"]), _p(row["name"], styles["table"])] + [_p(row[key], styles["table_right"]) for key in ["total", "resolved", "under_review", "escalated", "rejected"]])
  distribution_rows.append([_p("", styles["table_center"]), _p("TOTAL", styles["table"])] + [_p(report["summary"][key], styles["table_right"]) for key in ["total", "resolved", "under_review", "escalated", "rejected"]])
  distribution = Table(distribution_rows, colWidths=[10 * mm, 48 * mm, 18 * mm, 22 * mm, 25 * mm, 20 * mm, 20 * mm], repeatRows=1)
  distribution.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.35, colors.black), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2F3")),
    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EDEDED")), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
  ]))
  story.append(distribution)
  story.append(_p("III. CLASSIFICATION OF COMPLAINTS BY BARANGAY", styles["section"]))

  category_headers = ["No.", "Barangay", *[_display_category_name(category) for category in report["categories"]], "Total"]
  category_rows = [[_p(value, styles["table_center"] if index != 1 else styles["table"]) for index, value in enumerate(category_headers)]]
  for index, row in enumerate(report["barangays"], 1):
    category_rows.append([_p(index, styles["table_center"]), _p(row["name"], styles["table"])] + [_p(row["categories"][category], styles["table_right"]) for category in report["categories"]] + [_p(row["total"], styles["table_right"])])
  category_rows.append([_p("", styles["table_center"]), _p("TOTAL", styles["table"])] + [_p(report["category_totals"][category], styles["table_right"]) for category in report["categories"]] + [_p(report["summary"]["total"], styles["table_right"])])
  fixed_category_table_width = 10 * mm + 42 * mm + 18 * mm
  category_width = (document.width - fixed_category_table_width) / max(len(report["categories"]), 1)
  category = Table(category_rows, colWidths=[10 * mm, 42 * mm, *([category_width] * len(report["categories"])), 18 * mm], repeatRows=1)
  category.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.35, colors.black), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9E2F3")),
    ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EDEDED")), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
  ]))
  story.append(category)
  document.build(story)
  return output.getvalue()


async def generate_municipal_complaint_report(request: ComplaintReportRequest, current_user: User, db: AsyncSession) -> bytes:
  if current_user.role not in [UserRole.LGU_OFFICIAL, UserRole.SUPERADMIN]:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
  if request.from_date > request.to_date:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="from_date must not be after to_date")

  try:
    start_local = datetime.combine(request.from_date, time.min, tzinfo=APP_TIMEZONE)
    end_local = datetime.combine(request.to_date + timedelta(days=1), time.min, tzinfo=APP_TIMEZONE)
    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)
    date_filter = (Complaint.created_at >= start_utc, Complaint.created_at < end_utc)

    barangays = (await db.execute(select(Barangay).order_by(Barangay.barangay_name))).scalars().all()
    categories = (await db.execute(select(Category).order_by(Category.id))).scalars().all()
    status_group = _status_group_expression().label("status_group")

    status_rows = (await db.execute(
      select(Complaint.barangay_id, status_group, func.count(Complaint.id))
      .where(*date_filter)
      .group_by(Complaint.barangay_id, status_group)
    )).all()
    category_rows = (await db.execute(
      select(Complaint.barangay_id, Complaint.category_id, func.count(Complaint.id))
      .where(*date_filter)
      .group_by(Complaint.barangay_id, Complaint.category_id)
    )).all()

    barangay_data = {barangay.id: {"name": barangay.barangay_name, "total": 0, "resolved": 0, "under_review": 0, "escalated": 0, "rejected": 0, "categories": {category.category_name: 0 for category in categories}} for barangay in barangays}
    category_name_by_id = {category.id: category.category_name for category in categories}
    for barangay_id, status_group_value, count in status_rows:
      if barangay_id in barangay_data and status_group_value in barangay_data[barangay_id]:
        barangay_data[barangay_id][status_group_value] += count
    for barangay_id, category_id, count in category_rows:
      category_name = category_name_by_id.get(category_id)
      if barangay_id in barangay_data and category_name is not None:
        barangay_data[barangay_id]["categories"][category_name] += count

    report_barangays = list(barangay_data.values())
    for row in report_barangays:
      row["total"] = sum(row[key] for key in ["resolved", "under_review", "escalated", "rejected"])
      row["category_total"] = sum(row["categories"].values())
    summary = {key: sum(row[key] for row in report_barangays) for key in ["total", "resolved", "under_review", "escalated", "rejected"]}
    category_totals = {category.category_name: sum(row["categories"][category.category_name] for row in report_barangays) for category in categories}
    report = {
      "summary": summary,
      "barangays": report_barangays,
      "categories": [category.category_name for category in categories],
      "category_totals": category_totals,
      "period_label": f"{_format_report_date(request.from_date)} - {_format_report_date(request.to_date)}",
      "generated_label": _format_report_date(datetime.now(APP_TIMEZONE).date()),
    }
    return _build_complaint_report_pdf(report)
  except HTTPException:
    raise
  except Exception as exc:
    logger.exception("Error generating municipal complaint report: %s", exc)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while generating the report.") from exc

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
    logger.exception(f"Error generating monthly report for barangay ID {barangay_id}: {str(e)}")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while generating the report.")
  

async def get_overall_reports(db: AsyncSession, month: Optional[int] = None, year: Optional[int] = None):
  try:
    now = datetime.now(timezone.utc)
    target_month = month if month is not None else now.month
    target_year = year if year is not None else now.year
    
    cache_key = f"overall_report:{target_month}:{target_year}"
    cached_report = await get_cache(cache_key)
    if cached_report:
      logger.info(f"Overall report for {target_month}/{target_year} retrieved from cache")
      return cached_report
    
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
          IncidentModel.first_reported_at >= start_date,
          IncidentModel.first_reported_at < end_date
        )
      )
    )
    incidents = result.scalars().all()
    for incident in incidents:
      category_name = incident.category.category_name if incident.category else None
      if category_name in category_summary:
        category_summary[category_name]["incidents"].append({
          "incident_id": incident.id,
          "incident_title": incident.title,
          "complaint_count": incident.complaint_count,
        })
        category_summary[category_name]["total_complaint_count"] += incident.complaint_count
    report = [{
      "category": category_name,
      "total_incidents": len(summary["incidents"]),
      "incidents": summary["incidents"],
      "total_complaint_count": summary["total_complaint_count"],
    } for category_name, summary in category_summary.items()]
    await set_cache(cache_key, report, expiration=3600)
    return report
  except HTTPException:
    raise
  except Exception as exc:
    logger.exception("Error generating overall report: %s", exc)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while generating the report.") from exc
    