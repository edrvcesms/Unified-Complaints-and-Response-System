from fastapi import HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_auth_schema import BarangayAuthLoginData
from app.schemas.barangay_schema import BarangayWithUserData
from app.models.barangay import Barangay
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from sqlalchemy import select
from app.core.security import decrypt_password
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from datetime import datetime
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.utils.logger import logger
from app.utils.cookies import set_cookies

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from datetime import datetime

async def barangay_authenticate(login_data: BarangayAuthLoginData, db: AsyncSession, response: Response):

    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not decrypt_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password"
        )

    if user.role != "barangay_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden"
        )

    user.last_login = datetime.utcnow()
    await db.commit()

    refresh_token = create_refresh_token(data={"user_id": user.id})
    access_token = create_access_token(data={"user_id": user.id})
    

    result = await db.execute(
        select(Barangay)
        .options(
            selectinload(Barangay.barangay_account)
            .selectinload(BarangayAccount.user)
        )
        .where(
            Barangay.barangay_account.has(
                BarangayAccount.user_id == user.id
            )
        )
    )

    barangay = result.scalars().first()

    if not barangay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Barangay not found"
        )

    barangay_data = BarangayWithUserData.model_validate(
        barangay,
        from_attributes=True
    )
    
    await set_cookies(response, refresh_token, key="barangay_refresh_token")
    logger.info(f"Cookies set for user ID {user.id} with refresh token")

    response = {
        "message": "Login successful",
        "barangayAccessToken": access_token,
        "barangayAccountData": barangay_data.model_dump()
    }

    return response

async def refresh_barangay_token(request: Request):
    try:
        refresh_token = request.cookies.get("barangay_refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing"
            )
        
        is_valid = verify_token(refresh_token)
        user_id = is_valid.get("user_id") if is_valid else None 
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        new_access_token = create_access_token(data={"user_id": user_id})
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"barangay_access_token": new_access_token}
        )
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error during token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while refreshing the token. Please try again later."
        )