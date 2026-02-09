from app.core.cloudinary_config import cloudinary
from cloudinary.uploader import upload
from fastapi import UploadFile


async def upload_to_cloudinary(file: UploadFile, folder: str) -> str:
    try:
        content = await file.read()
        if not content:
            raise ValueError("File content is empty.")
        
        result = upload(content, folder=folder)

        return result.get("secure_url")
    
    except Exception as e:
        
        raise ValueError(f"Failed to upload file to Cloudinary: {str(e)}")
    
async def upload_multiple_images_to_cloudinary(files: list[UploadFile], folder: str) -> list[str]:
    urls = []
    for file in files:
        url = await upload_to_cloudinary(file, folder)
        urls.append(url)
    return urls

async def delete_from_cloudinary(public_id: str) -> bool:
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        raise ValueError(f"Failed to delete file from Cloudinary: {str(e)}")