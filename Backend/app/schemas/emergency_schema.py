# app/schemas/emergency_schema.py
from pydantic import BaseModel
from typing import List

class EmergencyClassifyRequest(BaseModel):
    title: str
    description: str
    category_id: int

class EmergencyClassifyResponse(BaseModel):
    is_emergency: bool
    agency: str | None  # ["BFP"], ["PNP"], ["MDRRMO"], or combinations like ["BFP", "MDRRMO"]
    confidence: str      # "high", "medium", "low"
    reason: str | None