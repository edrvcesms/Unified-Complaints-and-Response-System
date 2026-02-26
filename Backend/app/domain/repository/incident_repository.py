"""
Infrastructure Layer — SQLAlchemy Incident Repository.

Implements IIncidentRepository from the domain layer.
Responsible for all incident and cluster persistence.
Maps between ORM models and domain entities (anti-corruption layer).
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.incident import IncidentEntity
from app.domain.entities.complaint_cluster import ComplaintClusterEntity
from app.domain.interfaces.i_incident_repository import IIncidentRepository
from app.domain.value_objects.severity_level import SeverityLevel
from app.models.incident_model import IncidentModel
from app.models.incident_complaint import IncidentComplaintModel
from app.models.category_config import CategoryConfigModel

class IncidentRepository(IIncidentRepository):
    """
    DIP: The application layer depends on IIncidentRepository.
    This class is the concrete PostgreSQL/SQLAlchemy implementation.
    Swapping to a different DB = implement IIncidentRepository, change DI wiring.
    """

    def __init__(self, db: AsyncSession):
        self._db = db


    async def get_by_id(self, incident_id: int) -> Optional[IncidentEntity]:
        result = await self._db.execute(
            select(IncidentModel).where(IncidentModel.id == incident_id)
        )
        model = result.scalars().first()
        return self._to_entity(model) if model else None

    async def create(self, incident: IncidentEntity) -> IncidentEntity:
        model = self._to_model(incident)
        self._db.add(model)
        await self._db.flush()  
        await self._db.refresh(model)
        return self._to_entity(model)

    async def update(self, incident: IncidentEntity) -> IncidentEntity:
        result = await self._db.execute(
            select(IncidentModel).where(IncidentModel.id == incident.id)
        )
        model = result.scalars().first()
        if not model:
            raise ValueError(f"Incident {incident.id} not found")

        model.complaint_count = incident.complaint_count
        model.severity_score = incident.severity_score
        model.severity_level = incident.severity_level.value
        model.last_reported_at = incident.last_reported_at
        model.status = incident.status

        await self._db.flush()
        await self._db.refresh(model)
        return self._to_entity(model)

    async def link_complaint(self, cluster: ComplaintClusterEntity) -> ComplaintClusterEntity:
        model = IncidentComplaintModel(
            incident_id=cluster.incident_id,
            complaint_id=cluster.complaint_id,
            similarity_score=cluster.similarity_score,
            linked_at=cluster.linked_at or datetime.utcnow(),
        )
        self._db.add(model)
        await self._db.flush()
        await self._db.refresh(model)
        cluster.id = model.id
        return cluster

    async def count_complaints_in_window(
        self,
        incident_id: int,
        window_hours: float,
    ) -> int:
        cutoff = datetime.utcnow() - timedelta(hours=window_hours)
        result = await self._db.execute(
            select(func.count(IncidentComplaintModel.id))
            .where(
                IncidentComplaintModel.incident_id == incident_id,
                IncidentComplaintModel.linked_at >= cutoff,
            )
        )
        return result.scalar() or 0

    async def get_category_config(self, category_id: int):
        """
        Fetch category-specific config (weight, window, threshold).
        Returns a dict for loose coupling — avoids importing CategoryConfigModel upward.
        """
      
        result = await self._db.execute(
            select(CategoryConfigModel).where(CategoryConfigModel.category_id == category_id)
        )
        config = result.scalars().first()
        if not config:
            # Safe defaults for unconfigured categories
            return {
                "base_severity_weight": 2.0,
                "time_window_hours": 24.0,
                "similarity_threshold": 0.65,
            }
        return {
            "base_severity_weight": config.base_severity_weight,
            "time_window_hours": config.time_window_hours,
            "similarity_threshold": config.similarity_threshold,
        }

    def _to_entity(self, model: IncidentModel) -> IncidentEntity:
        return IncidentEntity(
            id=model.id,
            title=model.title,
            description=model.description,
            barangay_id=model.barangay_id,
            category_id=model.category_id,
         
            status=model.status,
            complaint_count=model.complaint_count,
            severity_score=model.severity_score,
            severity_level=SeverityLevel(model.severity_level),
            time_window_hours=model.time_window_hours,
            first_reported_at=model.first_reported_at,
            last_reported_at=model.last_reported_at,
        )

    def _to_model(self, entity: IncidentEntity) -> IncidentModel:
        return IncidentModel(
            title=entity.title,
            description=entity.description,
            barangay_id=entity.barangay_id,
            category_id=entity.category_id,
           
            status=entity.status,
            complaint_count=entity.complaint_count,
            severity_score=entity.severity_score,
            severity_level=entity.severity_level.value,
            time_window_hours=entity.time_window_hours,
            first_reported_at=entity.first_reported_at,
            last_reported_at=entity.last_reported_at,
        )
        
        
    async def get_active_incidents_in_window(
    self,
    barangay_id: int,
    category_id: int,
    time_window_hours: float,
) -> list[IncidentEntity]:
      cutoff = datetime.utcnow() - timedelta(hours=time_window_hours)
      result = await self._db.execute(
        select(IncidentModel).where(
            IncidentModel.barangay_id == barangay_id,
            IncidentModel.category_id == category_id,
            IncidentModel.status == "ACTIVE",
            IncidentModel.last_reported_at >= cutoff,
        )
    )
      models = result.scalars().all()
      return [self._to_entity(m) for m in models]
      
    async def get_incident_complaint_statuses(self, incident_id: int) -> list[str]:
        """
        Get all complaint statuses for a given incident.
        Returns a list of unique statuses.
        """
        from app.models.complaint import Complaint
        
        result = await self._db.execute(
            select(Complaint.status)
            .join(IncidentComplaintModel, Complaint.id == IncidentComplaintModel.complaint_id)
            .where(IncidentComplaintModel.incident_id == incident_id)
        )
        statuses = result.scalars().all()
        return list(set(statuses))  # Return unique statuses