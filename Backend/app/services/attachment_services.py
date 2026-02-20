from fastapi import UploadFile, HTTPException, status
from app.models.attachment import Attachment
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.tasks import upload_attachments_task
from datetime import datetime
import os
from typing import List
import tempfile

allowed_file_types = [
    "image/jpeg", "image/png", "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "video/mp4", "video/mpeg", "video/quicktime",
    "video/x-msvideo", "video/x-ms-wmv"
]


async def upload_attachments(files: List[UploadFile], uploader_id: int, complaint_id: int, db: AsyncSession) -> str:

    for file in files:
        if file.content_type not in allowed_file_types:
            logger.warning(f"Unsupported file type: {file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file.content_type}"
            )

    temp_dir = tempfile.mkdtemp(prefix="upload_")
    files_data = []

    try:
        for file in files:
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as temp_file:
                temp_file.write(await file.read())

            files_data.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "temp_path": temp_path
            })

        urls = upload_attachments_task.delay(files_data, complaint_id=complaint_id, uploader_id=uploader_id)
        if not urls:
            logger.error("Failed to enqueue attachment upload task")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to enqueue upload task"
            )
          

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error preparing attachments for upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process attachments"
        )