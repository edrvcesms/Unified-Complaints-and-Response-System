from pydantic import BaseModel

class SectorModel(BaseModel):
    sector_name: str
    description: str