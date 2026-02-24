import asyncio
from cloudinary.uploader import upload as sync_upload, destroy as sync_destroy
from fastapi import UploadFile
from app.utils.logger import logger
from typing import List


def _detect_resource_type(filename: str) -> str:
    ext = filename.split(".")[-1].lower()

    if ext in ["jpg", "jpeg", "png", "gif", "bmp", "webp"]:
        return "image"

    if ext in ["mp4", "mov", "avi", "mkv", "webm"]:
        return "video"

    if ext in ["pdf", "doc", "docx", "txt", "xlsx", "pptx"]:
        return "raw"

    return "auto"  # fallback


async def upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    try:
        content = await file.read()

        if not content:
            raise ValueError("File content is empty.")

        resource_type = _detect_resource_type(file.filename)

        result = await asyncio.to_thread(
            sync_upload,
            content,
            folder=folder,
            resource_type=resource_type
        )

        return result["secure_url"]

    except Exception as e:
        logger.error(f"Failed to upload file {file.filename}: {e}")
        raise ValueError(f"Failed to upload file {file.filename}: {e}")


async def upload_multiple_files_to_cloudinary(
    files: List[UploadFile],
    folder: str
) -> List[str]:

    tasks = [upload_to_cloudinary(f, folder) for f in files]
    return await asyncio.gather(*tasks)

async def delete_from_cloudinary(public_id: str) -> bool:
    try:
        result = await asyncio.to_thread(sync_destroy, public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"Failed to delete file {public_id} from Cloudinary: {e}")
        return False 

async def delete_multiple_from_cloudinary(public_ids: List[str]) -> List[bool]:
    # Run deletions concurrently
    tasks = [delete_from_cloudinary(pid) for pid in public_ids]
    results = await asyncio.gather(*tasks)
    return results