from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession 
from app.models.department import Department
from app.models.department_account import DepartmentAccount
from app.schemas.department_schema import DepartmentWithUserData
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.utils.logger import logger

async def get_department_account(user_id: int, db: AsyncSession) -> DepartmentWithUserData:
    try:
      result = await db.execute(select(Department).options(selectinload(Department.department_account).selectinload(DepartmentAccount.user)).where(Department.department_account.has(DepartmentAccount.user_id == user_id)))
      
      logger.info(f"Executed query to get department with user ID: {user_id}")
    
      department = result.scalars().first()
      
      logger.info(f"Fetched department with ID: {department.id if department else 'None'}")
      
      if not department:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
      department_with_user_data = DepartmentWithUserData.model_validate(department, from_attributes=True)
      logger.info(f"Department profile for user ID {user_id} retrieved from database")
      return department_with_user_data
    
    except HTTPException:
        raise
      
    except Exception as e:
        logger.error(f"Error in get_department_account: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
  