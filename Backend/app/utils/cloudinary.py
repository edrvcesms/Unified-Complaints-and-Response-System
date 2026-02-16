import asyncio
from cloudinary.uploader import upload as sync_upload, destroy as sync_destroy
from fastapi import UploadFile
from app.utils.logger import logger
from typing import List

async def upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    try:
        content = await file.read()
        if not content:
            raise ValueError("File content is empty.")

        result = await asyncio.to_thread(sync_upload, content, folder=folder)
        return result.get("secure_url")

    except Exception as e:
        logger.error(f"Failed to upload file {file.filename} to Cloudinary: {e}")
        raise ValueError(f"Failed to upload file {file.filename} to Cloudinary: {e}")
    
    
async def upload_multiple_files_to_cloudinary(files: List[UploadFile], folder: str) -> List[str]:
    
    tasks = [upload_to_cloudinary(f, folder) for f in files]
    urls = await asyncio.gather(*tasks)
    return urls


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