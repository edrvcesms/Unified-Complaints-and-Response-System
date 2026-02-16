from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException, status
from app.utils.logger import logger

class AttachmentSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            content_length = int(request.headers["content-length"])
            if content_length > 10 * 1024 * 1024:  # 10 MB limit
                logger.warning(f"Attachment size {content_length} exceeds limit")
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Attachment size exceeds the maximum allowed limit of 10 MB"
                )
                
        return await call_next(request)