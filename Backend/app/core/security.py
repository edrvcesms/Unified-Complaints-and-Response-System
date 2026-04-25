import bcrypt
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import jwt, JWTError

from app.core.config import settings
from app.core.redis import redis_client

TOKEN_AUDIENCE = "ucrs"
TOKEN_DENYLIST_PREFIX = "jwt_denylist"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def decrypt_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def _create_token(data: dict, token_type: str, expires_in_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_in_minutes)
    to_encode = data.copy()
    to_encode.update(
        {
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "jti": uuid4().hex,
            "aud": TOKEN_AUDIENCE,
            "token_type": token_type,
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict) -> str:
    return _create_token(data, "access", settings.ACCESS_TOKEN_EXPIRE_MINUTES)

def create_refresh_token(data: dict) -> str:
    return _create_token(data, "refresh", settings.REFRESH_TOKEN_EXPIRE_MINUTES)

def verify_token(token: str, expected_token_type: str | None = None) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=TOKEN_AUDIENCE,
        )
        if expected_token_type and payload.get("token_type") != expected_token_type:
            raise JWTError("Invalid token type")
        return payload
    
    except JWTError:
        raise JWTError("Invalid token")


async def is_token_revoked(jti: str | None) -> bool:
    if not jti:
        return False
    return bool(await redis_client.exists(f"{TOKEN_DENYLIST_PREFIX}:{jti}"))


async def revoke_token_jti(jti: str | None, expires_at) -> None:
    if not jti or expires_at is None:
        return

    if hasattr(expires_at, "timestamp"):
        expiration_timestamp = int(expires_at.timestamp())
    else:
        expiration_timestamp = int(expires_at)

    ttl = expiration_timestamp - int(datetime.now(timezone.utc).timestamp())
    if ttl <= 0:
        return

    await redis_client.setex(f"{TOKEN_DENYLIST_PREFIX}:{jti}", ttl, "revoked")
    
