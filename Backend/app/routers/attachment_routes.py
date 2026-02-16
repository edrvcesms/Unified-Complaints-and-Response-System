from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
import tempfile
import os
from app.tasks import upload_attachments_task
from app.utils.logger import logger
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.db_dependency import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

router = APIRouter()

@router.post("/upload-attachments")
async def upload_attachments_endpoint(files: list[UploadFile] = File(...), complaint_id: int = None, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):

    temp_dir = tempfile.mkdtemp(prefix="upload_")
    files_data = []

    try:
        for file in files:
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as f:
                f.write(await file.read())

            files_data.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "temp_path": temp_path
            })

        task = upload_attachments_task.apply_async(args=[files_data, complaint_id, current_user.id])
        if not task:
            logger.error("Failed to enqueue attachment upload task")
            return {"status": "error", "detail": "Failed to enqueue upload task"}
        logger.info(f"Attachment upload task enqueued with ID: {task.id}")
        return {"task_id": task.id, "status": "upload queued"}

    except Exception as e:
        logger.error(f"Error preparing attachments: {e}")
        return {"status": "error", "detail": str(e)}
