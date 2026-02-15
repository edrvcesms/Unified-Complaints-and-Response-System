from fastapi import HTTPException, Request, status, UploadFile
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.logger import logger
from app.schemas.user_auth_schema import LoginData, RegisterData, OTPVerificationData
from sqlalchemy import select
from app.core.security import hash_password, decrypt_password, verify_token
from datetime import datetime
from app.utils.otp_handler import generate_otp
from app.utils.cookies import set_cookies, clear_cookies
from app.utils.caching import set_cache, get_cache, delete_cache
from app.tasks import send_otp_email
from fastapi.responses import JSONResponse
from app.core.security import create_access_token, create_refresh_token
from app.utils.cloudinary import upload_multiple_images_to_cloudinary

async def register_user(user_data: RegisterData, db: AsyncSession):
    try:
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalars().first()

        if existing_user:
            logger.warning(f"Registration attempt with existing email: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        generated_otp = generate_otp()
        await set_cache(f"otp:{user_data.email}", generated_otp, expiration=300)
        print(f"OTP set in cache for {user_data.email}: {generated_otp}")
        logger.info(f"OTP generated for {user_data.email} and stored in cache.")

        send_otp_email.delay(user_data.email, generated_otp, purpose="Registration")
        logger.info(f"OTP task enqueued for {user_data.email}.")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "OTP sent to your email. Please verify to complete registration."}
        )
    
    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error during registration for {user_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration. Please try again later."
        )
    
async def verify_otp_and_register(
        otp: str, 
        user_data: OTPVerificationData, 
        front_id: UploadFile,
        back_id: UploadFile,
        selfie_with_id: UploadFile,
        db: AsyncSession
        ):

    try:
        cached_otp = await get_cache(f"otp:{user_data.email}")
        

        if not cached_otp:
            logger.warning(f"OTP verification failed for {user_data.email}: OTP expired or not found.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired or not found. Please request a new one."
            )

        if otp != str(cached_otp):
            logger.warning(f"OTP verification failed for {user_data.email}: Invalid OTP provided.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP. Please try again."
            )

        if not front_id or not back_id or not selfie_with_id:
            logger.warning(f"OTP verification failed for {user_data.email}: Missing ID images.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All ID images (front, back, selfie with ID) are required."
            )
        
        images = [front_id, back_id, selfie_with_id]
        image_urls = await upload_multiple_images_to_cloudinary(images, folder="ucrs/id_verification")
        logger.info(f"ID images uploaded to Cloudinary for {user_data.email}: {image_urls}")

        
        hashed_password = hash_password(user_data.password)

        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            middle_name=user_data.middle_name,
            suffix=user_data.suffix,
            age=user_data.age,
            birthdate=user_data.birthdate,
            phone_number=user_data.phone_number,
            gender=user_data.gender,
            barangay=user_data.barangay,
            zip_code=user_data.zip_code,
            full_address=user_data.full_address,
            longitude=user_data.longitude,
            latitude=user_data.latitude,
            id_type=user_data.id_type,
            id_number=user_data.id_number,
            front_id=image_urls[0],
            back_id=image_urls[1],
            selfie_with_id=image_urls[2],
            created_at=datetime.utcnow()
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        await delete_cache(f"otp:{user_data.email}")

        logger.info(f"User registered successfully with email: {user_data.email}")

        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Registration successful. You can now log in."}
        )

    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error during OTP verification and registration for {user_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during OTP verification. Please try again later."
        )


async def login_user(login_data: LoginData, db: AsyncSession):
    
    try:
        result = await db.execute(select(User).where(User.email == login_data.email))
        user = result.scalars().first()

        if not user:
            logger.warning(f"Login attempt with unregistered email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not decrypt_password(login_data.password, user.hashed_password):
            logger.warning(f"Login attempt with incorrect password for email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password"
            )

        logger.info(f"User logged in successfully with email: {login_data.email}")

        refresh_token = create_refresh_token(data={"user_id": user.id})
        access_token = create_access_token(data={"user_id": user.id})

        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Login successful", "access_token": access_token, "refresh_token": refresh_token}
        )

        await set_cookies(response, refresh_token=refresh_token)

        return response
    
    except HTTPException:
        raise

    except Exception as e:
        await db.rollback()
        logger.error(f"Error during login for {login_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login. Please try again later." 
        )

async def logout_user(request: Request):
    try:
        cookies = request.cookies.get("refresh_token") or request.cookies.get("access_token")
        if not cookies:
            logger.warning("Logout attempt with missing authentication cookies.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication cookies found. Are you sure you're logged in?"
            )
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Logout successful"
            }
        )
        response.delete_cookie(key="access_token")
        response.delete_cookie(key="refresh_token")
        return response
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during logout. Please try again later."
        )

async def refresh_access_token(request: Request):
    
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            logger.warning("Invalid or missing refresh token during token refresh attempt.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expired or invalid refresh token."
            )

        try:
            payload = verify_token(refresh_token)
        except JWTError:
            logger.warning("Invalid refresh token provided during token refresh attempt.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token during token refresh attempt."
            )

        user_id = payload.get("user_id")
        if not user_id:
            logger.warning("Invalid refresh token payload: user_id missing during token refresh attempt.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload during token refresh attempt."
            )

        new_access_token = create_access_token(data={"user_id": user_id})
        logger.info(f"Access token refreshed for user_id: {user_id} during token refresh attempt.")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Access token refreshed successfully",
                "access_token": new_access_token
            }
        )
    except Exception as e:
        logger.error(f"Error during access token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while refreshing access token. Please try again later."
        )
    
    except HTTPException:   
        raise