from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    suffix: Optional[str] = None
    age: int
    birthdate: Optional[datetime] = None
    phone_number: Optional[str] = None
    gender: str
    barangay: str
    full_address: str
    zip_code: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None

class UserPersonalData(UserBase):
    pass

