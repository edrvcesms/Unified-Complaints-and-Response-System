from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.logger import logger
from app.tasks import upload_attachments_task, upload_remarks_attachment
from app.utils.attachments import validate_upload_files
import base64
from typing import List


async def upload_attachments(files: List[UploadFile], uploader_id: int, complaint_id: int, db: AsyncSession) -> str:
    await validate_upload_files(files)

    files_data = []

    try:
        for file in files:
            content_bytes = await file.read()

            files_data.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "content_b64": base64.b64encode(content_bytes).decode("ascii"),
                "file_size": len(content_bytes),
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


async def enqueue_response_attachments(
    files: List[UploadFile],
    response_id: int,
    responder_id: int
) -> None:

    files_data = []

    try:
        
        await validate_upload_files(files)
        for file in files:
            content_bytes = await file.read()

            files_data.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "content_b64": base64.b64encode(content_bytes).decode("ascii"),
                "file_size": len(content_bytes),
            })

        task_result = upload_remarks_attachment.delay(
            files_data,
            response_id=response_id,
            responder_id=responder_id
        )
        if not task_result:
            logger.error("Failed to enqueue response attachment upload task")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to enqueue response attachment upload task"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing response attachments for upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process response attachments"
        )