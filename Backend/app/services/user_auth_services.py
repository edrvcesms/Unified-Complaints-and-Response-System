from fastapi import HTTPException, Request, status, UploadFile
from jose import JWTError
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.logger import logger
from app.schemas.user_auth_schema import LoginData, RegisterData, OTPVerificationData
from sqlalchemy import select
from app.core.security import hash_password, decrypt_password, verify_token
from datetime import datetime
from app.utils.otp_handler import generate_otp
from app.utils.cookies import set_cookies
from app.utils.caching import set_cache, get_cache, delete_cache
from app.tasks import send_otp_email_task
from fastapi.responses import JSONResponse
from app.core.security import create_access_token, create_refresh_token
from app.utils.cloudinary import upload_multiple_files_to_cloudinary
from app.constants.roles import UserRole
from app.schemas.barangay_schema import BarangayWithUserData
from app.schemas.department_schema import DepartmentWithUserData
from app.services.department_services import get_department_account
from app.services.barangay_services import get_barangay_account


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

        send_otp_email_task.delay(user_data.email, generated_otp, purpose="Registration")
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
    
async def verify_otp_and_register(otp: str, user_data: OTPVerificationData, front_id: UploadFile, back_id: UploadFile, selfie_with_id: UploadFile, db: AsyncSession):

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
        image_urls = await upload_multiple_files_to_cloudinary(images, folder="ucrs/id_verification")
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
    barangay_data = None
    department_data = None

    try:
        result = await db.execute(select(User).where(User.email == login_data.email))
        user = result.scalars().first()

        if not user:
            logger.warning(f"Login attempt with unregistered email: {login_data.email}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        if not decrypt_password(login_data.password, user.hashed_password):
            logger.warning(f"Login attempt with incorrect password for email: {login_data.email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password")

        if user.role == UserRole.BARANGAY_OFFICIAL:
            barangay = await get_barangay_account(user.id, db)
            if not barangay:
                logger.warning(f"Login attempt for barangay official with no associated barangay: {login_data.email}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated barangay not found")
            barangay_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)

        if user.role == UserRole.DEPARTMENT_STAFF:
            department = await get_department_account(user.id, db)
            if not department:
                logger.warning(f"Login attempt for department staff with no associated department: {login_data.email}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated department not found")
            department_data = DepartmentWithUserData.model_validate(department, from_attributes=True)

        logger.info(f"User logged in successfully with email: {login_data.email}")

        refresh_token = create_refresh_token(data={"user_id": user.id})
        access_token = create_access_token(data={"user_id": user.id})

        user_cache = {
            "barangay_data": jsonable_encoder(barangay_data.model_dump()) if barangay_data else None,
            "department_data": jsonable_encoder(department_data.model_dump()) if department_data else None
        }
        await set_cache(f"user_data:{user.id}", user_cache, expiration=3600)
        logger.info(f"User data cached for user_id: {user.id}")

        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder({
                "message": "Login successful",
                "access_token": access_token,
                "refresh_token": refresh_token if user.role == UserRole.USER else None,
                "barangayAccountData": user_cache["barangay_data"] if barangay_data else None,
                "departmentAccountData": user_cache["department_data"] if department_data else None
            })
        )

        await set_cookies(response, refresh_token=refresh_token)
        return response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error during login for {login_data.email}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during login. Please try again later.")



async def refresh_access_token(request: Request, db: AsyncSession):
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                refresh_token = auth_header.split(" ", 1)[1]  
  
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
            
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        
        barangay_data = None
        department_data = None
        cached_user_data = await get_cache(f"user_data:{user_id}")
        
        if user.role == UserRole.BARANGAY_OFFICIAL:
            barangay_json_data = cached_user_data.get("barangay_data") if cached_user_data else None
            if barangay_json_data:
                logger.info(f"Barangay data for user_id: {user.id} retrieved from cache during token refresh.")
                barangay_data = BarangayWithUserData.model_validate(jsonable_encoder(barangay_json_data))
                logger.info(f"Barangay data for user_id: {user.id} successfully validated from cache during token refresh.")
            else:
                logger.info(f"Barangay data for user_id: {user.id} not found in cache during token refresh. Fetching from database.")
                barangay = await get_barangay_account(user.id, db)
                barangay_data = BarangayWithUserData.model_validate(barangay, from_attributes=True)
            
            
        if user.role == UserRole.DEPARTMENT_STAFF:
            department_json_data = cached_user_data.get("department_data") if cached_user_data else None
            if department_json_data:
                logger.info(f"Department data for user_id: {user.id} retrieved from cache during token refresh.")
                department_data = DepartmentWithUserData.model_validate(jsonable_encoder(department_json_data))
            else:
                logger.info(f"Department data for user_id: {user.id} not found in cache during token refresh. Fetching from database.")
                department = await get_department_account(user_id, db)
                department_data = DepartmentWithUserData.model_validate(department, from_attributes=True)
        

        new_access_token = create_access_token(data={"user_id": user_id})
        logger.info(f"Access token refreshed for user_id: {user_id} during token refresh attempt.")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder({
                "message": "Access token refreshed successfully",
                "access_token": new_access_token,
                "barangayAccountData": barangay_data if user.role == UserRole.BARANGAY_OFFICIAL else None,
                "departmentAccountData": department_data if user.role == UserRole.DEPARTMENT_STAFF else None
            })
        )
    
    except HTTPException:   
        raise
    except Exception as e:
        logger.error(f"Error during access token refresh: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while refreshing access token. Please try again later.")

async def logout_user(request: Request):
    try:
        cookies = request.cookies.get("refresh_token") or request.cookies.get("access_token")
        if not cookies:
            logger.warning("Logout attempt with missing authentication cookies.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication cookies found. Are you sure you're logged in?"
            )
        
        await delete_cache(f"user_data:{request.cookies.get('user_id')}")
        logger.info("User logged out successfully and cache cleared.")
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Logout successful"
            }
        )
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