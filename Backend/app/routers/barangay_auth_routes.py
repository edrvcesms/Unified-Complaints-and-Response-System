from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.dependencies.rate_limiter import limiter, rate_limit_exceeded_handler
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_auth_schema import BarangayAuthLoginData
from app.services.barangay_auth_services import barangay_authenticate, refresh_barangay_token
from app.services.user_auth_services import logout_user
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from fastapi.responses import Response

router = APIRouter()

@router.post("/login", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def barangay_login(request: Request, login_data: BarangayAuthLoginData, db: AsyncSession = Depends(get_async_db), response: Response = None):
    return await barangay_authenticate(login_data, db, response)
    
@router.post("/logout", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def barangay_logout_route(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_async_db)):
    return await logout_user(request, current_user, db)
    
@router.post("/token-refresh", status_code=status.HTTP_200_OK)
async def refresh_barangay_token_route(request: Request):
    return await refresh_barangay_token(request)