from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.barangay_auth_schema import BarangayAuthLoginData
from app.models.barangay_account import BarangayAccount
from app.models.user import User
from sqlalchemy import select
from app.core.security import decrypt_password
from fastapi.responses import JSONResponse
from datetime import datetime
from app.core.security import create_access_token, create_refresh_token
from app.utils.logger import logger
from app.utils.cookies import clear_cookies, set_cookies

async def barangay_authenticate(login_data: BarangayAuthLoginData, db: AsyncSession):
    try:
        result = await db.execute(select(User).where(User.email == login_data.email))
        user = result.scalars().first()
        logger.info(f"Attempting login for barangay admin with email: {login_data.email}")

        if not user:
            raise(HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            ))
        
        if not decrypt_password(login_data.password, user.hashed_password):
            raise(HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password"
            ))
        
        if user.role != "barangay_admin":
            raise(HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Not a barangay administrator"
            ))
            
        user.last_login = datetime.utcnow()
        await db.commit()

        logger.info(f"Barangay admin logged in successfully with email: {login_data.email}")
        
        refresh_token = create_refresh_token(data={"user_id": user.id})
        access_token = create_access_token(data={"user_id": user.id})
        
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Login successful", "access_token": access_token}
        )
        
        await set_cookies(response, refresh_token=refresh_token)

        return response
    except Exception as e:
        logger.error(f"Error during barangay admin login for {login_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login. Please try again later."
        )
    except HTTPException:
        raise
