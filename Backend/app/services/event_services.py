from sqlalchemy import select
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import base64
from app.models.event import Event
from app.utils.logger import logger
from typing import List, Optional
from app.schemas.event_schema import EventCreate, EventData
from app.tasks import upload_event_media_task, delete_event_media_task
from app.utils.caching import set_cache, get_cache, delete_cache
from app.utils.cache_invalidator import invalidate_cache
from datetime import datetime, timezone
from app.utils.attachments import validate_upload_files

async def get_events(db: AsyncSession):
    try:
        events_cache = await get_cache("events_cache")
        if events_cache is not None:
            logger.info("Events fetched from cache")
            return [
                EventData.model_validate_json(e)
                if isinstance(e, str)
                else EventData.model_validate(e, from_attributes=True)
                for e in events_cache
            ]

        result = await db.execute(
            select(Event)
            .options(selectinload(Event.media))
            .where(Event.date >= datetime.now(timezone.utc))
            .order_by(Event.date.asc())
        )
        events = result.scalars().all()
        event_data = [EventData.model_validate(event, from_attributes=True) for event in events]
        serialized_events = [event.model_dump_json() for event in event_data]
        await set_cache("events_cache", serialized_events, expiration=300)
        logger.info("Events stored in cache")
        return event_data
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch events")
    
async def get_event_by_id(event_id: int, db: AsyncSession):
    try:
        event_cache = await get_cache(f"event_{event_id}")
        if event_cache is not None:
            logger.info(f"Event {event_id} fetched from cache")
            return EventData.model_validate_json(event_cache) if isinstance(event_cache, str) else EventData.model_validate(event_cache, from_attributes=True)

        result = await db.execute(
            select(Event)
            .where(Event.id == event_id)
            .options(selectinload(Event.media))
        )
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        event_data = EventData.model_validate(event, from_attributes=True)
        serialized_event = event_data.model_dump_json()
        await set_cache(f"event_{event_id}", serialized_event, expiration=300)
        logger.info(f"Event {event_id} stored in cache")
        return event_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching event {event_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch event")

async def create_new_event(event_data: EventCreate, event_files: Optional[List[UploadFile]], db: AsyncSession) -> Event:
    try:
        if event_files:
            await validate_upload_files(event_files)

        new_event = Event(
            event_name=event_data.event_name,
            description=event_data.description,
            date=event_data.date,
            location=event_data.location
        )
        db.add(new_event)
        await db.commit()
        await db.refresh(new_event)

        if event_files:
            event_media = []
            
            try:
                for file in event_files:
                    content_bytes = await file.read()
                    
                    event_media.append({
                        "filename": file.filename,
                        "content_type": file.content_type,
                        "content_b64": base64.b64encode(content_bytes).decode("ascii"),
                        "file_size": len(content_bytes),
                    })

                task = upload_event_media_task.delay(event_media, event_id=new_event.id)
                
                if not task:
                    logger.error("Failed to enqueue event media upload task")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to enqueue media upload task"
                    )
                    
            except HTTPException:
                raise
            
            except Exception as e:
                await db.rollback()
                logger.error(f"Error preparing event media for upload: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to prepare media for upload"
                )
        await delete_cache("events_cache")
        await delete_cache(f"event_{new_event.id}")
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={"message": "Event created successfully", "event_id": new_event.id}
        )
      
    except HTTPException:
        raise
      
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create event")
    
async def update_event(event_id: int, event_data: EventCreate, event_files: Optional[List[UploadFile]],keep_media_ids: Optional[List[int]], db: AsyncSession,):
    try:
        if event_files:
            await validate_upload_files(event_files)

        keep_ids = keep_media_ids or []

        result = await db.execute(
            select(Event)
            .where(Event.id == event_id)
            .options(selectinload(Event.media))
        )
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )

        if event.media:
            media_to_delete = [media for media in event.media if media.id not in keep_ids]
            if media_to_delete:
                logger.info(f"Deleting {len(media_to_delete)} event media files not in keep list")

                for old_media in media_to_delete:
                    await db.delete(old_media)

                delete_event_media_task.delay([media.media_url for media in media_to_delete], event_id=event.id)
                logger.info(f"Queued {len(media_to_delete)} event media files for Cloudinary deletion")

                await db.flush()

        event.event_name = event_data.event_name
        event.description = event_data.description
        event.date = event_data.date
        event.location = event_data.location
        event.updated_at = datetime.now(timezone.utc)

        await db.commit()

        if event_files:
            event_media = []

            try:
                for file in event_files:
                    content_bytes = await file.read()

                    event_media.append({
                        "filename": file.filename,
                        "content_type": file.content_type,
                        "content_b64": base64.b64encode(content_bytes).decode("ascii"),
                        "file_size": len(content_bytes),
                    })

                task = upload_event_media_task.delay(event_media, event_id=event.id)

                if not task:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to enqueue media upload task"
                    )

                logger.info(f"Enqueued upload task for {len(event_media)} new event media files")

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error processing media files: {str(e)}",
                )
                
        await invalidate_cache(event_ids=[event_id])

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Event updated successfully", "event_id": event.id}
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating event {event_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update event",
        )
    
async def delete_event(event_id: int, db: AsyncSession):
    try:
        result = await db.execute(select(Event).options(selectinload(Event.media)).where(Event.id == event_id))
        event = result.scalars().first()
        
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        
        media_urls = [media.media_url for media in event.media]
        if media_urls:
            delete_event_media_task.delay(media_urls, event_id=event_id)
        
        await db.delete(event)
        await db.commit()
        
        await invalidate_cache(event_ids=[event_id])
        
        return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Event deleted successfully"})
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting event {event_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete event")
    

    