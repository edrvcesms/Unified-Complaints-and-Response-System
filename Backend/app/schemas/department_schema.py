from .user_schema import UserData
from pydantic import BaseModel, EmailStr

class DepartmentModel(BaseModel):
    department_name: str
    description: str
    
class DepartmentAccountOut(BaseModel):
    id: int
    user_id: int
    department_id: int
    user: UserData
    
class DepartmentWithUserData(DepartmentModel):
    id: int
    department_account: DepartmentAccountOut