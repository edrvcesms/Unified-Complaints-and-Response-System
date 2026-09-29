from pydantic import BaseModel

class RespondentsModel(BaseModel):
    name: str
    email: str | None = None
    
class IncidentHearingModel(BaseModel):
    incident_id: int
    hearing_date: str
    