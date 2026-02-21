from fastapi import APIRouter, Depends, HTTPException, Request
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.schemas.barangay_schema import BarangayAccountCreate
from app.admin._super_admin_services import create_barangay_account, create_complaint_category, create_priority_level, create_department, create_department_account
from fastapi import status
from app.admin._super_admin_schemas import ComplaintCategoryCreate, PriorityLevelCreate, DepartmentCreate

router = APIRouter()


@router.post("/create-brgy-account", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_barangay(request: Request, barangay_data: BarangayAccountCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_barangay_account(barangay_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/create-category", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_category(request: Request, category_data: ComplaintCategoryCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_complaint_category(category_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/create-priority-level", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_priority(request: Request, priority_data: PriorityLevelCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_priority_level(priority_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/create-department", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_department_route(request: Request, department_data: DepartmentCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_department(department_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/create-department-account", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_department_account_route(request: Request, user_id: int = None, department_id: int = None, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_department_account(user_id, department_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e