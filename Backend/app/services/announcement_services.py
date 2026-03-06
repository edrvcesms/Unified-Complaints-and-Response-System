from fastapi import HTTPException, status, File, UploadFile
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.models.barangay_account import BarangayAccount
from app.schemas.barangay_schema import BarangayAccountOut
from app.models.announcements import Announcement
import tempfile
from app.schemas.announcement_schema import AnnouncementCreate, AnnouncementOut
from app.tasks import upload_announcement_media_task
from app.utils.logger import logger
from app.models.user import User
from app.constants.roles import UserRole
import os

allowed_media_types = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"]

async def get_all_announcements(db: AsyncSession):
    try:
      result = await db.execute(
          select(Announcement).options(
              selectinload(Announcement.uploader),
              selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
              selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
              selectinload(Announcement.media)
          ).order_by(Announcement.created_at.desc())
      )
      announcements = result.scalars().all()
      return [AnnouncementOut.model_validate(announcement) for announcement in announcements]
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving announcements: {str(e)}"
        )
        
async def get_announcement_by_id(announcement_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Announcement).where(Announcement.id == announcement_id).options(
                selectinload(Announcement.uploader),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Announcement.media)
            )
        )
        announcement = result.scalar_one_or_none()
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        return AnnouncementOut.model_validate(announcement)
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving announcement: {str(e)}"
        )

async def create_announcement(announcement_data: AnnouncementCreate, media_files:  Optional[List[UploadFile]], uploader_id: int, db: AsyncSession):
    
    try:
        # Validate media files only if provided
        if media_files:
            for media in media_files:
                if media.content_type not in allowed_media_types:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unsupported media type: {media.content_type}"
                    )
        
        user_result = await db.execute(select(User).where(User.id == uploader_id))
        user = user_result.scalar_one_or_none()
        
        barangay_account_id = None
        
        if user and user.role == UserRole.BARANGAY_OFFICIAL:
            result = await db.execute(select(BarangayAccount).where(BarangayAccount.user_id == uploader_id))
            logger.info(f"Queried BarangayAccount for uploader_id={uploader_id}")
            barangay_account = result.scalar_one_or_none()
            logger.info(f"Retrieved BarangayAccount: {barangay_account}")
            barangay_account_id = barangay_account.id if barangay_account else None
        
        new_announcement = Announcement(
            uploader_id=uploader_id,
            title=announcement_data.title,
            content=announcement_data.content,
            barangay_account_id=barangay_account_id
        )
        db.add(new_announcement)
        await db.commit()
        await db.flush()
        
        result = await db.execute(
            select(Announcement).where(Announcement.id == new_announcement.id).options(
                selectinload(Announcement.uploader),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Announcement.media)
            )
        )
        new_announcement = result.scalar_one()
        
        # Process media files only if provided
        if media_files:
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
            
      
        return AnnouncementOut.model_validate(new_announcement)
      
    except HTTPException:
        raise
      
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating announcement: {str(e)}"
        )
    
    
    
            
    