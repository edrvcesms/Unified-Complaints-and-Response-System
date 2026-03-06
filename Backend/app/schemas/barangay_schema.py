from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from .user_schema import UserData

class BarangayModel(BaseModel):
    barangay_name: str
    barangay_address: str
    barangay_contact_number: str
    barangay_email: EmailStr

class BarangayAccountCreate(BarangayModel):
    password: str

class BarangayAccountOut(BaseModel):
    id: int
    user_id: int
    barangay_id: int
    user: UserData
    
    class Config:
        from_attributes = True

class BarangayOut(BarangayModel):
    id: int
    
    class Config:
        from_attributes = True

class BarangayAccountWithDetails(BaseModel):
    id: int
    user_id: int
    barangay_id: int
    barangay: BarangayOut
    
    class Config:
        from_attributes = True

class BarangayWithUserData(BarangayModel):
    id: int
    barangay_account: BarangayAccountOut
    forwarded_incident_count: int = 0
    new_forwarded_incident_count: int = 0
    
    class Config:
        from_attributes = True