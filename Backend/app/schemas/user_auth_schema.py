from pydantic import BaseModel, EmailStr
from datetime import datetime
from .user_schema import UserBase

class UserAuthModel(BaseModel):
    email: EmailStr
    phone_number: str

class RegisterData(UserAuthModel):
    pass

class OTPVerificationData(UserAuthModel, UserBase):
    password: str
    otp: str
    
class ResendOtpData(UserAuthModel):
    pass

class LoginData(UserAuthModel):
    role: str
    password: str



