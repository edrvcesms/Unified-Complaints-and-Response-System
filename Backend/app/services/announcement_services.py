from fastapi import HTTPException, status, File, UploadFile
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.announcements import Announcement
import tempfile
from app.models.user import User
from app.schemas.announcement_schema import AnnouncementCreate
from app.tasks import upload_announcement_media_task
import os

allowed_media_types = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"]

async def create_announcement(announcement_data: AnnouncementCreate, media_files: List[UploadFile], uploader_id: int, db: AsyncSession):
    
    try:
        for media in media_files:
            if media.content_type not in allowed_media_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported media type: {media.content_type}"
                )
                
        new_announcement = Announcement(
            uploader_id=uploader_id,  
            title=announcement_data.title,
            content=announcement_data.content
        )
        db.add(new_announcement)
        await db.commit()
        await db.refresh(new_announcement)
        
        temp_dir = tempfile.mkdtemp(prefix="announcement_media_")
        files_data = []

        try:
            for media in media_files:
                temp_path = os.path.join(temp_dir, media.filename)

                with open(temp_path, "wb") as temp_file:
                    temp_file.write(await media.read())

                files_data.append({
                    "filename": media.filename,
                    "content_type": media.content_type,
                    "temp_path": temp_path
                })

            medias = upload_announcement_media_task.delay(
                files_data,
                announcement_id=new_announcement.id,
                uploader_id=uploader_id
            )

            if not medias:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to enqueue media upload task"
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing media files: {str(e)}"
            )
      
        return new_announcement
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating announcement: {str(e)}"
        )
    
    
    
            
    