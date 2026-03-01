from fastapi import HTTPException, status
import redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.otp_handler import generate_otp
from app.schemas.user_schema import UserPersonalData, ChangePasswordData, VerifyEmailData, UserData, VerifyResetPasswordOTPData, UserLocationData, ResetPasswordData
from app.models.user import User
from sqlalchemy import select, update
from app.core.security import hash_password, decrypt_password
from fastapi.responses import JSONResponse
from app.tasks import send_otp_email_task
from app.utils.logger import logger
from app.utils.caching import set_cache, get_cache, delete_cache
from app.core.config import settings
import httpx

async def get_user_by_id(user_id: int, db: AsyncSession) -> UserData:
    try:
        user_cached = await get_cache(f"user_profile:{user_id}")
        if user_cached:
            logger.info(f"User profile for user ID {user_id} retrieved from cache")
            return UserData.model_validate_json(user_cached)
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        user_data = UserData.model_validate(user, from_attributes=True)
        await set_cache(f"user_profile:{user_id}", user_data.model_dump_json(), expiration=3600)
        return user_data
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error retrieving user by ID {user_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def forgot_password(email_data: VerifyEmailData, db: AsyncSession):
    try:
        result = await db.execute(select(User).where(User.email == email_data.email))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if user.email == email_data.email:
            generated_otp = generate_otp()
            await set_cache(f"otp_reset_password:{email_data.email}", generated_otp, expiration=300)

            send_otp_email_task.delay(email_data.email, generated_otp, purpose="Forgot Password")

            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "OTP sent to your email. Please verify to proceed."}
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting forgot password for email {email_data.email}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def create_new_password(password_data: ResetPasswordData, db: AsyncSession):
    try:
        cached = await get_cache(f"otp_reset_password:{password_data.email}")
        
        if cached:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP verification pending. Please verify the OTP sent to your email before creating a new password.")
        
        result = await db.execute(select(User).where(User.email == password_data.email))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if password_data.new_password != password_data.confirm_new_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match")
        
        user.hashed_password = hash_password(password_data.new_password)
        
        await db.commit()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Password reset successfully"}
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating new password for email {password_data.email}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def request_reset_password(email_data: VerifyEmailData, db: AsyncSession):
    
    try:
        result = await db.execute(select(User).where(User.email == email_data.email))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if user.email == email_data.email:
            generated_otp = generate_otp()
            await set_cache(f"otp_reset_password:{email_data.email}", generated_otp, expiration=300)

            send_otp_email_task.delay(email_data.email, generated_otp, purpose="Reset Password")

            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"message": "OTP sent to your email. Please verify to proceed."}
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting reset password for email {email_data.email}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


async def verify_otp_reset_password(otp_data: VerifyResetPasswordOTPData, db: AsyncSession):

    try: 
        cached_reset_otp = await get_cache(f"otp_reset_password:{otp_data.email}")

        if not cached_reset_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired or not found. Please request a new one.")
        
        if otp_data.otp != cached_reset_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP. Please try again.")
        
        await delete_cache(f"otp_reset_password:{otp_data.email}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "OTP verified successfully. You can now reset your password."}
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error verifying OTP for reset password: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def change_password(password_data: ChangePasswordData, db: AsyncSession):

    try:
        result = await db.execute(
            select(User).where(User.email == password_data.email)
        )
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
    
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error changing password for user ID {password_data}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
async def update_user_location(user_id: int, location_data: UserLocationData, db: AsyncSession):
    try:
        logger.info(f"Updating location for user ID {user_id} to latitude {location_data.latitude} and longitude {location_data.longitude}")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        user.latitude = location_data.latitude
        user.longitude = location_data.longitude
        
       
       
        await delete_cache(f"user_profile:{user_id}")


        await db.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Location updated successfully"}
        )
    
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating location for user ID {user_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))




async def save_push_token(db: AsyncSession, user_id: str, token: str) -> User:
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ValueError(f"User with id '{user_id}' not found.")

        user.push_token = token

        db.commit()
        db.refresh(user)

        return user
    except ValueError:
        raise
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to save push token for user '{user_id}': {e}") from e


async def send_push_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    data: dict = {},
) -> dict:
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ValueError(f"User with id '{user_id}' not found.")
       
       
        if not user.push_token:
            return {"status": "skipped", "reason": f"User '{user_id}' has no push token registered."}

    except ValueError:
        raise
    except Exception as e:
        raise Exception(f"Failed to fetch user '{user_id}' from database: {e}") from e

    try:
        payload = {
            "to": user.push_token,
            "title": title,
            "body": body,
            "data": data,
            "sound": "default",
            "priority": "high",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.EXPO_PUSH_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )

        if response.status_code != 200:
            raise Exception(f"Expo push notification failed: {response.status_code} - {response.text}")

        result = response.json()

        errors = [item for item in result.get("data", []) if item.get("status") == "error"]
        if errors:
            raise Exception(f"Expo reported delivery errors: {errors}")

        return result
    except Exception as e:
        raise Exception(f"Failed to send push notification to user '{user_id}': {e}") from e