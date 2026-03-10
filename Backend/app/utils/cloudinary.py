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
    """
    Delete a file from Cloudinary. Tries multiple resource types if needed.
    """
    try:
        # Try to detect resource type from public_id path
        resource_type = "image"  # Default to image
        if "video" in public_id or any(ext in public_id.lower() for ext in ["mp4", "mov", "avi"]):
            resource_type = "video"
        
        logger.info(f"Attempting to delete {public_id} as {resource_type}")
        result = await asyncio.to_thread(sync_destroy, public_id, resource_type=resource_type)
        
        if result.get("result") == "ok":
            logger.info(f"Successfully deleted {public_id}")
            return True
        elif result.get("result") == "not found":
            # Try other resource types
            logger.warning(f"File {public_id} not found as {resource_type}, trying other types")
            for alt_type in ["video", "image", "raw"]:
                if alt_type == resource_type:
                    continue
                try:
                    result = await asyncio.to_thread(sync_destroy, public_id, resource_type=alt_type)
                    if result.get("result") == "ok":
                        logger.info(f"Successfully deleted {public_id} as {alt_type}")
                        return True
                except Exception:
                    pass
            logger.error(f"Could not delete {public_id} with any resource type")
            return False
        else:
            logger.error(f"Unexpected result deleting {public_id}: {result}")
            return False
    except Exception as e:
        logger.error(f"Exception while deleting {public_id} from Cloudinary: {type(e).__name__}: {e}")
        return False

async def delete_multiple_from_cloudinary(public_ids: List[str], max_concurrent: int = 2) -> List[bool]:
    """Delete multiple files with rate limiting to avoid connection pool issues"""
    semaphore = asyncio.Semaphore(max_concurrent)
    async def limited_delete(pid):
        async with semaphore:
            return await delete_from_cloudinary(pid)
    tasks = [limited_delete(pid) for pid in public_ids]
    return await asyncio.gather(*tasks)

def extract_public_id_from_url(url: str) -> str:
    """
    Extract the public_id from a Cloudinary URL.
    Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/uuid_filename.jpg
    Returns: folder/uuid_filename
    """
    try:
        parts = url.split('/upload/')
        if len(parts) < 2:
            logger.error(f"Invalid Cloudinary URL format: {url}")
            return ""
        
        path_after_upload = parts[1]
        
        if path_after_upload.startswith('v'):
            path_parts = path_after_upload.split('/', 1)
            if len(path_parts) > 1:
                path_after_upload = path_parts[1]
        
        public_id = path_after_upload.rsplit('.', 1)[0]
        
        return public_id
    except Exception as e:
        logger.error(f"Failed to extract public_id from URL {url}: {e}")
        return ""