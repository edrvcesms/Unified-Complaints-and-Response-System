from fastapi import APIRouter, Depends, HTTPException, Request
from pinecone import Pinecone
from app.core.config import settings
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.schemas.barangay_schema import BarangayAccountCreate
from app.admin._super_admin_services import create_barangay_account, create_complaint_category, create_department, create_lgu_account, delete_pinecone_data, get_user_rejected_complaints, verify_user_account, get_all_unverified_users, get_all_categories, get_all_users, update_category_configs, get_submission_restricted_users, get_suspended_users, lift_suspension, remove_submission_restriction
from fastapi import status
from app.admin._super_admin_schemas import ComplaintCategoryCreate, LGUAccountCreate, DepartmentAccountCreate, CategoryConfigsUpdate
from app.schemas.emergency_hotline import CreateEmergencyHotlineModel
from app.services.emergency_hotline_services import add_emergency_hotlines, get_emergency_hotlines
from typing import Optional

router = APIRouter()


@router.post("/emergency-hotlines/add-hotline", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_emergency_hotline(
    request: Request,
    hotline_data: CreateEmergencyHotlineModel,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action.")

    return await add_emergency_hotlines(hotline_data, db)


@router.get("/emergency-hotlines", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_emergency_hotlines_route(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    return await get_emergency_hotlines(db)


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
    
    
@router.post("/create-department", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_department_route(request: Request, department_data: DepartmentAccountCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_department(department_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
    
@router.post("/create-lgu-account", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_lgu_account_route(request: Request, lgu_data: LGUAccountCreate, db: AsyncSession = Depends(get_async_db)):
    try:
        return await create_lgu_account(lgu_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/verify-user-account/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def verify_user_account_route(request: Request, user_id: int, db: AsyncSession = Depends(get_async_db)):
    try:
        return await verify_user_account(user_id, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.get("/unverified-users", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_unverified_users_route(
    request: Request,
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_all_unverified_users(current_user, db, page=page, page_size=page_size)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e


@router.get("/users", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_users_route(
    request: Request,
    page: int = 1,
    page_size: int = 10,
    is_verified: Optional[bool] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_all_users(current_user, db, page=page, page_size=page_size, is_verified=is_verified)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.get("/categories", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_categories_route(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_all_categories(current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.patch("/categories/{category_id}/update-configs", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def update_category_configs_route(
    request: Request,
    category_id: int,
    config_data: CategoryConfigsUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await update_category_configs(category_id, config_data, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.delete("/delete-pinecone-data", status_code=status.HTTP_200_OK)
@limiter.limit("22/minute")
async def delete_pinecone_data_route(request: Request, index_name: str, db: AsyncSession = Depends(get_async_db)):
    try:
        # Initialize Pinecone client
        pc = Pinecone(api_key=settings.PINECONE_API_KEY, environment=settings.PINECONE_ENVIRONMENT)
        
        # List existing indexes
        index_names = [idx["name"] for idx in pc.list_indexes()] 
        
        if index_name not in index_names:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Index '{index_name}' not found. Existing indexes: {index_names}"
            )
        
        # Delete all vectors
        index = pc.Index(index_name)
        index.delete(delete_all=True)
        
        return {"detail": f"Pinecone data deleted successfully from index '{index_name}'"}
    
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting Pinecone data: {str(e)}"
        )
        
@router.get("/submission-restricted-users", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_submission_restricted_users_route(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_submission_restricted_users(current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.get("/suspended-users", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_suspended_users_route(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_suspended_users(current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e

@router.post("/lift-suspension/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def lift_suspension_route(
    request: Request,
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await lift_suspension(user_id, current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.post("/remove-submission-restriction/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def remove_submission_restriction_route(
    request: Request,
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await remove_submission_restriction(user_id, current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e
    
@router.get("/rejected-complaints/{user_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def get_user_rejected_complaints_route(
    request: Request,
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await get_user_rejected_complaints(user_id, current_user, db)
    except RateLimitExceeded as e:
        raise rate_limit_exceeded_handler(None, e)
    except HTTPException as e:
        raise e