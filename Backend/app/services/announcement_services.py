from fastapi import HTTPException, status, UploadFile
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.models.barangay_account import BarangayAccount
from app.models.announcements import Announcement
from app.models.announcement_media import AnnouncementMedia
import tempfile
from app.schemas.announcement_schema import AnnouncementCreate, AnnouncementOut
from app.utils.cache_invalidator import invalidate_cache
from app.tasks import upload_announcement_media_task, delete_cloudinary_media_task, delete_announcement_media_task
from app.utils.logger import logger
from app.models.user import User
from app.utils.caching import get_cache, set_cache, delete_cache
from app.constants.roles import UserRole
from app.utils.cloudinary import extract_public_id_from_url
import os

allowed_media_types = ["image/jpeg", "image/png", "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-ms-wmv"]

async def get_all_announcements(db: AsyncSession):
    try:
        all_announcement_cache = await get_cache("all_announcements")
        if all_announcement_cache:
            logger.info("Cache hit for all announcements")
            return [AnnouncementOut.model_validate_json(announcement) if isinstance(announcement, str) else AnnouncementOut.model_validate(announcement) for announcement in all_announcement_cache]
        
        result = await db.execute(
            select(Announcement).options(
                selectinload(Announcement.uploader),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Announcement.media)
            ).order_by(Announcement.created_at.desc())
        )
        announcements = result.scalars().all()
        all_announcements = [AnnouncementOut.model_validate(announcement, from_attributes=True) for announcement in announcements]
        await set_cache("all_announcements", [announcement.model_dump_json() for announcement in all_announcements], expiration=300)
        return all_announcements
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving announcements: {str(e)}"
        )
        
async def get_announcement_by_id(announcement_id: int, db: AsyncSession):
    try:
        announcement_cache = await get_cache(f"announcement:{announcement_id}")
        if announcement_cache:
            logger.info(f"Cache hit for announcement ID {announcement_id}")
            return AnnouncementOut.model_validate_json(announcement_cache) if isinstance(announcement_cache, str) else AnnouncementOut.model_validate(announcement_cache)
        
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
            
        announcement_out = AnnouncementOut.model_validate(announcement, from_attributes=True)
        await set_cache(f"announcement:{announcement_id}", announcement_out.model_dump_json(), expiration=300)
        return announcement_out
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving announcement: {str(e)}"
        )
        
async def get_announcement_by_uploader(uploader_id: int, db: AsyncSession):
    try:
        announcement_by_uploader_cache = await get_cache(f"announcements_by_uploader:{uploader_id}")
        if announcement_by_uploader_cache:
            logger.info(f"Cache hit for announcements by uploader ID {uploader_id}")
            return [AnnouncementOut.model_validate_json(announcement) if isinstance(announcement, str) else AnnouncementOut.model_validate(announcement) for announcement in announcement_by_uploader_cache]

        result = await db.execute(
            select(Announcement).options(
                selectinload(Announcement.uploader),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Announcement.media)
            ).order_by(Announcement.created_at.desc()).where(Announcement.uploader_id == uploader_id)
        )
        announcements = result.scalars().all()
        announcements_by_uploader = [AnnouncementOut.model_validate(announcement, from_attributes=True) for announcement in announcements]
        await set_cache(f"announcements_by_uploader:{uploader_id}", [announcement.model_dump_json() for announcement in announcements_by_uploader], expiration=300)
        return announcements_by_uploader
    
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving announcements: {str(e)}"
        )

async def create_announcement(announcement_data: AnnouncementCreate, media_files:  Optional[List[UploadFile]], uploader_id: int, db: AsyncSession):
    
    try:
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
                    
                if medias:
                    await invalidate_cache(
                        announcement_uploader_id=uploader_id,
                        announcement_id=new_announcement.id
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
    
    
async def edit_announcement(announcement_id: int, announcement_data: AnnouncementCreate, media_files: Optional[List[UploadFile]], keep_media_ids: List[int], uploader_id: int, db: AsyncSession):
    try:
        if media_files:
            for media in media_files:
                if media.content_type not in allowed_media_types:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unsupported media type: {media.content_type}"
                    )
        
        result = await db.execute(
            select(Announcement).where(Announcement.id == announcement_id).options(
                selectinload(Announcement.media)
            )
        )
        announcement = result.scalar_one_or_none()
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        if announcement.uploader_id != uploader_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this announcement"
            )
        
        if announcement.media:
            for media in announcement.media:
                if media.id not in keep_media_ids:
                    delete_announcement_media_task.delay(
                        media.media_url,
                        announcement_id=announcement.id,
                        uploader_id=uploader_id
                    )
        
        announcement.title = announcement_data.title
        announcement.content = announcement_data.content
        
        await db.commit()
        await db.flush()
        
        if media_files:
            temp_dir = tempfile.mkdtemp(prefix="announcement_media_update_")
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
                    announcement_id=announcement.id,
                    uploader_id=uploader_id
                )

                if not medias:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to enqueue media upload task"
                    )
                    
                logger.info(f"Enqueued upload task for {len(files_data)} new media files")
                
                if medias:
                    await invalidate_cache(announcement_uploader_id=uploader_id, announcement_id=announcement.id)
                    logger.info(f"Invalidated relevant caches after enqueuing media upload task")

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error processing media files: {str(e)}"
                )
        
        result = await db.execute(
            select(Announcement).where(Announcement.id == announcement_id).options(
                selectinload(Announcement.uploader),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.barangay),
                selectinload(Announcement.barangay_account).selectinload(BarangayAccount.user),
                selectinload(Announcement.media)
            )
        )
        updated_announcement = result.scalar_one()
        
        return AnnouncementOut.model_validate(updated_announcement)
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error editing announcement: {str(e)}"
        )

async def delete_announcement(announcement_id: int, uploader_id: int, db: AsyncSession):
    try:
        result = await db.execute(
            select(Announcement).where(Announcement.id == announcement_id).options(
                selectinload(Announcement.media)
            )
        )
        announcement = result.scalar_one_or_none()
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Announcement not found"
            )
        
        if announcement.uploader_id != uploader_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this announcement"
            )
        deleted = delete_announcement_media_task.delay(
            [media.media_url for media in announcement.media],
            announcement_id=announcement.id,
            uploader_id=uploader_id
        )
        if deleted:
            await db.delete(announcement)
            await db.commit()
            await db.flush()
            logger.info(f"Announcement {announcement_id} deleted from database, media deletion task enqueued")
            
        if not deleted:
            logger.warning(f"Failed to enqueue media deletion task for announcement {announcement_id}")
            
        logger.info(f"Announcement {announcement_id} and its media deleted successfully")
        await invalidate_cache(announcement_uploader_id=uploader_id, announcement_id=announcement.id)
        return {"detail": "Announcement deleted successfully"}
    
    except HTTPException:
        raise
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting announcement: {str(e)}"
        )
        
        