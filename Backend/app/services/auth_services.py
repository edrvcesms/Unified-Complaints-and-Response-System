from fastapi import HTTPException, Request, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.logger import logger
from app.schemas.auth_schema import LoginData, RegisterData, OTPVerificationData
from sqlalchemy import select
from app.core.security import hash_password, decrypt_password, verify_token
from datetime import datetime
from app.utils.otp_handler import generate_otp
from app.utils.cookies import set_cookies, clear_cookies
from app.utils.caching import set_cache, get_cache, delete_cache
from app.tasks import send_otp_email
from fastapi.responses import JSONResponse
from app.core.security import create_access_token, create_refresh_token

async def register_user(user_data: RegisterData, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalars().first()

    if existing_user:
        logger.warning(f"Registration attempt with existing email: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    generated_otp = generate_otp()
    set_cache(f"otp:{user_data.email}", generated_otp, expiration=300)
    print(f"OTP set in cache for {user_data.email}: {generated_otp}")
    logger.info(f"OTP generated for {user_data.email} and stored in cache.")

    send_otp_email.delay(user_data.email, generated_otp, purpose="Registration")
    logger.info(f"OTP task enqueued for {user_data.email}.")

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "OTP sent to your email. Please verify to complete registration."}
    )

    
async def verify_otp_and_register(otp: str, user_data: OTPVerificationData, db: AsyncSession):

    cached_otp = get_cache(f"otp:{user_data.email}")
    print(cached_otp)

    if not cached_otp:
        logger.warning(f"OTP verification failed for {user_data.email}: OTP expired or not found.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found. Please request a new one."
        )

    if otp != cached_otp.decode('utf-8'):
        logger.warning(f"OTP verification failed for {user_data.email}: Invalid OTP provided.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )

    hashed_password = hash_password(user_data.password)

    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    delete_cache(f"otp:{user_data.email}")

    logger.info(f"User registered successfully with email: {user_data.email}")

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "Registration successful. You can now log in."}
    )

async def login_user(login_data: LoginData, db: AsyncSession):
    
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
        content={"message": "Login successful", "access_token": access_token}
    )

    await set_cookies(response, refresh_token=refresh_token)

    return response

async def logout_user(response: JSONResponse):
    await clear_cookies(response)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Logout successful"}
    )

async def refresh_access_token(request: Request):
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