import logging
from fastapi import HTTPException, Request, status
import httpx
from app.core.config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
logger = logging.getLogger(__name__)


def _get_allowed_hostnames() -> set[str]:
    raw = settings.TURNSTILE_ALLOWED_HOSTNAMES or ""
    return {
        hostname.strip().lower()
        for hostname in raw.split(",")
        if hostname.strip()
    }


async def verify_turnstile(token: str | None, request: Request, expected_action: str) -> None:
    if (
        not token
        or not isinstance(token, str)
        or len(token) == 0
        or len(token) > 2048
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request data."
        )

    secret = settings.TURNSTILE_SECRET_KEY
    allowed_hostnames = _get_allowed_hostnames()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Turnstile secret key is not configured."
        )

    if not expected_action or not allowed_hostnames:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Turnstile verification is not configured."
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
    except (httpx.HTTPError, ValueError):
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

    result_action = str(result.get("action") or "").strip()
    result_hostname = str(result.get("hostname") or "").strip().lower()
    if result_action != expected_action or result_hostname not in allowed_hostnames:
        logger.warning(
            "Turnstile action/hostname mismatch: action=%s hostname=%s",
            result_action,
            result_hostname,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turnstile verification failed."
        )