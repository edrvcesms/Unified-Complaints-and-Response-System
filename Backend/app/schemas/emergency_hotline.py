from pydantic import BaseModel
from typing import List, Optional

class EmergencyAgencyModel(BaseModel):
    id: int
    agency_name: str
    contact_number: str
    
    class Config:
        from_attributes = True
        
class CreateEmergencyHotlineModel(BaseModel):
    agency_name: str
    contact_numbers: List[str]