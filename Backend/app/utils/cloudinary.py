import asyncio
from cloudinary.uploader import upload as sync_upload, destroy as sync_destroy
from fastapi import UploadFile
from app.utils.logger import logger
from typing import List
import uuid

def _detect_resource_type(filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    if ext in ["jpg", "jpeg", "png", "gif", "bmp", "webp"]:
        return "image"
    if ext in ["mp4", "mov", "avi", "mkv", "webm"]:
        return "video"
    if ext in ["pdf", "doc", "docx", "txt", "xlsx", "pptx"]:
        return "raw"
    return "auto"

async def upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    try:
        await file.seek(0)
        resource_type = _detect_resource_type(file.filename)
        if '.' in file.filename:
            filename_base = file.filename.rsplit('.', 1)[0]
            file_ext = file.filename.rsplit('.', 1)[1].lower()
        else:
            filename_base = file.filename
            file_ext = None
        public_id = f"{uuid.uuid4()}_{filename_base}"
        upload_params = {
            "folder": folder,
            "resource_type": resource_type,
            "public_id": public_id
        }
        if resource_type == "raw" and file_ext:
            upload_params["format"] = file_ext
        result = await asyncio.to_thread(sync_upload, file.file, **upload_params)
        return result.get("secure_url")
    except Exception as e:
        logger.error(f"Failed to upload file {file.filename}: {e}")
        raise ValueError(f"Failed to upload file {file.filename}: {e}")

async def upload_multiple_files_to_cloudinary(files: List[UploadFile], folder: str, max_concurrent: int = 2) -> List[str]:
    semaphore = asyncio.Semaphore(max_concurrent)
    async def limited_upload(file):
        async with semaphore:
            return await upload_to_cloudinary(file, folder)
    tasks = [limited_upload(f) for f in files]
    return await asyncio.gather(*tasks)

async def delete_from_cloudinary(public_id: str) -> bool:
    try:
        result = await asyncio.to_thread(sync_destroy, public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"Failed to delete file {public_id} from Cloudinary: {e}")
        return False

async def delete_multiple_from_cloudinary(public_ids: List[str]) -> List[bool]:
    tasks = [delete_from_cloudinary(pid) for pid in public_ids]
    return await asyncio.gather(*tasks)