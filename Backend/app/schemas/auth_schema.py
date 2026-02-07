from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserAuthModel(BaseModel):
    email: EmailStr
    password: str

class RegisterData(UserAuthModel):
    pass

class OTPVerificationData(UserAuthModel):
    otp: str

class LoginData(UserAuthModel):
    pass



