from pydantic import BaseModel, EmailStr
from datetime import datetime
from .user_schema import UserBase

class UserAuthModel(BaseModel):
    email: EmailStr

class RegisterData(UserAuthModel):
    pass

class OTPVerificationData(UserAuthModel, UserBase):
    password: str
    otp: str

class LoginData(UserAuthModel):
    password: str



