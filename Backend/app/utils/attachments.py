from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException, UploadFile, status
from typing import Any, Iterable, Mapping, Optional
from app.utils.logger import logger

MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024
ALLOWED_MEDIA_TYPES = [
    "image/jpeg",
    "image/png",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
]


def validate_media_type(content_type: Optional[str], allowed_media_types: Optional[Iterable[str]] = None) -> None:
    allowed_types = set(allowed_media_types or ALLOWED_MEDIA_TYPES)
    if content_type not in allowed_types:
        logger.warning(f"Unsupported media type: {content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media type: {content_type}",
        )


def validate_file_size(file_size: int) -> None:
    if file_size > MAX_ATTACHMENT_SIZE_BYTES:
        logger.warning(f"Attachment size {file_size} exceeds limit")
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Attachment size exceeds the maximum allowed limit of 100 MB",
        )


def validate_encoded_upload(file_data: Mapping[str, Any], allowed_media_types: Optional[Iterable[str]] = None) -> None:
    validate_media_type(file_data.get("content_type"), allowed_media_types)
    validate_file_size(int(file_data.get("file_size", 0)))


async def validate_upload_files(files: Iterable[UploadFile], allowed_media_types: Optional[Iterable[str]] = None) -> None:
    for file in files:
        validate_media_type(file.content_type, allowed_media_types)

        size = getattr(file, "size", None)
        if size is None and getattr(file, "file", None) is not None:
            current_pos = file.file.tell()
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(current_pos)

        if size is not None:
            validate_file_size(int(size))

class AttachmentSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.headers.get("content-length"):
            content_length = int(request.headers["content-length"])
            validate_file_size(content_length)
                
        return await call_next(request)