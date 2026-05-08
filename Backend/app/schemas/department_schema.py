from .user_schema import UserData
from pydantic import BaseModel, EmailStr

class DepartmentModel(BaseModel):
    id: int
    department_name: str
    description: str

    class Config:
        from_attributes = True
    
class DepartmentAccountOut(BaseModel):
    id: int
    user_id: int
    department_id: int
    user: UserData

    class Config:
        from_attributes = True
    
class DepartmentWithUserData(DepartmentModel):
    department_account: DepartmentAccountOut

    class Config:
        from_attributes = True