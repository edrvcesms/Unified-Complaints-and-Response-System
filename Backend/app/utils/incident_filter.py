
from app.core.pagination_params import IncidentListParams
from app.models.incident_model import IncidentModel
from sqlalchemy import case, select, func, or_, cast, String
from app.models.incident_complaint import IncidentComplaintModel
from app.models.complaint import Complaint
from app.models.category import Category
from app.models.barangay import Barangay
from app.models.incident_model import IncidentModel
from app.core.pagination_params import IncidentListParams

SEVERITY_LEVEL_WEIGHT = case(
    (IncidentModel.severity_level == "VERY_HIGH", 4),
    (IncidentModel.severity_level == "HIGH", 3),
    (IncidentModel.severity_level == "MODERATE", 2),
    (IncidentModel.severity_level == "LOW", 1),
    else_=0,
)
PRIORITY_SCORE = (SEVERITY_LEVEL_WEIGHT * 3) + IncidentModel.severity_score

def _apply_incident_filters_and_sort(statement, params: IncidentListParams):
    """Apply the shared severity/date/complaint-status/search filters and
    sort ordering used by both the active and archive incident list views."""

    if params.severity_level:
        statement = statement.where(IncidentModel.severity_level == params.severity_level)

    if params.severity_score_min is not None:
        statement = statement.where(IncidentModel.severity_score >= params.severity_score_min)

    if params.severity_score_max is not None:
        statement = statement.where(IncidentModel.severity_score < params.severity_score_max)

    if params.date_from:
        statement = statement.where(func.date(IncidentModel.first_reported_at) >= params.date_from)

    if params.date_to:
        statement = statement.where(func.date(IncidentModel.first_reported_at) <= params.date_to)

    if params.complaint_status:
        complaint_status_filter = (
            select(IncidentComplaintModel.incident_id)
            .join(IncidentComplaintModel.complaint)
            .where(IncidentComplaintModel.incident_id == IncidentModel.id, Complaint.status == params.complaint_status)
            .exists()
        )
        statement = statement.where(complaint_status_filter)

    if params.search:
        term = f"%{params.search}%"
        statement = statement.where(or_(
            IncidentModel.title.ilike(term),
            cast(IncidentModel.id, String).ilike(term),
            select(Category.id).where(Category.id == IncidentModel.category_id, Category.category_name.ilike(term)).exists(),
            select(Barangay.id).where(Barangay.id == IncidentModel.barangay_id, Barangay.barangay_name.ilike(term)).exists(),
        ))

    sort_column = {
        "first_reported_at": IncidentModel.first_reported_at,
        "last_reported_at": IncidentModel.last_reported_at,
        "priority": PRIORITY_SCORE,
    }.get(params.sort, IncidentModel.first_reported_at)
    default_order = "asc" if not params.sort else params.order
    return statement.order_by(sort_column.asc() if default_order == "asc" else sort_column.desc())

