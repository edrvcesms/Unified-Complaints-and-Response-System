from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.categories_services import get_all_categories, get_all_rejection_categories
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def read_categories(db: AsyncSession = Depends(get_async_db), current_user=Depends(get_current_user)):
    return await get_all_categories(db)

@router.get("/rejection", status_code=status.HTTP_200_OK)
async def read_rejection_categories(db: AsyncSession = Depends(get_async_db), current_user=Depends(get_current_user)):
    return await get_all_rejection_categories(db)