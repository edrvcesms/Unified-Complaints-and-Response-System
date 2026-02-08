from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.otp_handler import generate_otp
from app.schemas.user_schema import UserPersonalData, ChangePasswordData, VerifyEmailData, UserData, VerifyResetPasswordOTPData
from app.models.user import User
from sqlalchemy import select, update
from app.core.security import hash_password, decrypt_password
from fastapi.responses import JSONResponse
from app.tasks import send_otp_email
from app.utils.caching import set_cache, get_cache, delete_cache

async def get_user_by_id(user_id: int, db: AsyncSession) -> UserData:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return UserData.model_validate(user, from_attributes=True)


async def request_reset_password(email_data: VerifyEmailData, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == email_data.email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.email == email_data.email:
        generated_otp = generate_otp()
        set_cache(f"otp_reset_password:{email_data.email}", generated_otp, expiration=300)

        send_otp_email.delay(email_data.email, generated_otp, purpose="Reset Password")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "OTP sent to your email. Please verify to proceed."}
        )
    
async def verify_otp_reset_password(otp_data: VerifyResetPasswordOTPData, db: AsyncSession):

    cached_reset_otp = get_cache(f"otp_reset_password:{otp_data.email}")

    if not cached_reset_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired or not found. Please request a new one.")
    
    if otp_data.otp != cached_reset_otp.decode('utf-8'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP. Please try again.")
    
    delete_cache(f"otp_reset_password:{otp_data.email}")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "OTP verified successfully. You can now reset your password."}
    )

async def change_password(password_data: ChangePasswordData, db: AsyncSession):

    result = await db.execute(select(User).where(User.email == password_data.email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not decrypt_password(password_data.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    
    if password_data.new_password != password_data.confirm_new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")
    
    user.hashed_password = hash_password(password_data.new_password)

    await db.commit()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Password changed successfully"}
    )

async def update_user_data(user_id: int, user_data: UserPersonalData, db: AsyncSession):
    
    statement = (update(User).where(User.id == user_id).values(**user_data.dict(exclude_unset=True)).execution_options(synchronize_session="fetch").returning(User))

    result = await db.execute(statement)
    updated_user = result.fetchone()

    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    await db.commit()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "User data updated successfully"}
    )