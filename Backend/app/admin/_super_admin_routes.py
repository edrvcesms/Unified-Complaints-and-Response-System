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
from app.admin._super_admin_services import create_barangay_account, create_complaint_category, create_department, create_lgu_account, delete_pinecone_data
from fastapi import status
from app.admin._super_admin_schemas import ComplaintCategoryCreate, LGUAccountCreate, DepartmentAccountCreate

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
    
@router.delete("/delete-pinecone-data", status_code=status.HTTP_200_OK)
@limiter.limit("22/minute")
def delete_pinecone_data_route(request: Request, index_name: str):
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