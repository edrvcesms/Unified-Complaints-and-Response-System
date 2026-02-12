from pydantic import BaseModel, EmailStr

class BarangayAuthLoginData(BaseModel):
    email: EmailStr
    password: str