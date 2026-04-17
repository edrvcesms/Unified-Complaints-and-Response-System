from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import JWTError
from app.models.user import User
from app.dependencies.db_dependency import get_async_db
from app.utils.caching import get_cache, set_cache
from app.core.security import verify_token
from app.constants.roles import UserRole
from app.models.barangay_account import BarangayAccount
from app.models.department_account import DepartmentAccount
from app.utils.logger import logger

bearer = HTTPBearer()

USER_CACHE_TTL_SECONDS = 300
USER_CACHE_PREFIX = "auth_user"

def _user_cache_key(user_id: int) -> str:
    return f"{USER_CACHE_PREFIX}:{user_id}"

def _serialize_user_for_cache(user: User) -> dict:
    return {
        "id": user.id,
        "role": user.role,
        "barangay_account": {
            "id": user.barangay_account.id,
            "user_id": user.barangay_account.user_id,
            "barangay_id": user.barangay_account.barangay_id,
        } if user.barangay_account else None,
        "department_account": {
            "id": user.department_account.id,
            "user_id": user.department_account.user_id,
            "department_id": user.department_account.department_id,
        } if user.department_account else None,
    }

def _build_user_from_cache(cached_user: dict):
    if not isinstance(cached_user, dict):
        return None

    user_id = cached_user.get("id")
    role = cached_user.get("role")
    if not user_id or not role:
        return None

    user = User(id=user_id, role=role)

    barangay_account_data = cached_user.get("barangay_account")
    if isinstance(barangay_account_data, dict):
        user.barangay_account = BarangayAccount(
            id=barangay_account_data.get("id"),
            user_id=barangay_account_data.get("user_id"),
            barangay_id=barangay_account_data.get("barangay_id"),
        )

    department_account_data = cached_user.get("department_account")
    if isinstance(department_account_data, dict):
        user.department_account = DepartmentAccount(
            id=department_account_data.get("id"),
            user_id=department_account_data.get("user_id"),
            department_id=department_account_data.get("department_id"),
        )

    return user

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_async_db)
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing")

    try:
        payload = verify_token(token.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = None
    from_cache = False
    cache_key = _user_cache_key(user_id)
    cached_user = await get_cache(cache_key)
    if cached_user:
        user = _build_user_from_cache(cached_user)
        if user and user.role == UserRole.BARANGAY_OFFICIAL and not user.barangay_account:
            user = None
        if user and user.role == UserRole.DEPARTMENT_STAFF and not user.department_account:
            user = None
        from_cache = user is not None

    if not user:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(User.department_account),
            )
            .where(User.id == user_id)
        )
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await set_cache(cache_key, _serialize_user_for_cache(user), expiration=USER_CACHE_TTL_SECONDS)
    
    if user.role == UserRole.BARANGAY_OFFICIAL:
        logger.info(
            "Fetched user with barangay data (%s), Barangay: %s",
            "cache" if from_cache else "database",
            user.barangay_account.barangay_id if user.barangay_account else "N/A",
        )
        return user
    
    if user.role == UserRole.DEPARTMENT_STAFF:
        logger.info(
            "Fetched user with department data (%s), Department Account ID: %s",
            "cache" if from_cache else "database",
            user.department_account.id if user.department_account else "N/A",
        )
        return user

    return user
