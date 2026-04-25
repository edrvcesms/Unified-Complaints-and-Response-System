import logging
from fastapi import HTTPException, Request, status
import httpx
from app.core.config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
logger = logging.getLogger(__name__)


async def verify_turnstile(token: str | None, request: Request) -> None:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request data."
        )

    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Turnstile secret key is not configured."
        )

    payload = {
        "secret": secret,
        "response": token,
    }

    if request.client:
        payload["remoteip"] = request.client.host

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Turnstile verification service unavailable."
        )

    if not result.get("success"):
        logger.warning("Turnstile verification failed: %s", result)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnstile verification failed."
        )