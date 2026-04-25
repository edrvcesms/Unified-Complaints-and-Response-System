from fastapi import Request, status
from fastapi.responses import JSONResponse
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import verify_token


def _get_client_identity(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = verify_token(token, expected_token_type="access")
            user_id = payload.get("user_id")
            if user_id:
                return f"user:{user_id}"
        except JWTError:
            pass

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        if client_ip:
            return client_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return get_remote_address(request)


limiter = Limiter(key_func=_get_client_identity)

def rate_limit_exceeded_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Rate limit exceeded. Try again later."},
    )
