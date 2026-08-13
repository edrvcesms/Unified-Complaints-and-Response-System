from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json
from app.dependencies.db_dependency import get_async_db
from app.services.event_services import create_new_event, get_my_events, update_event, delete_event, get_event_by_id, get_events
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.schemas.event_schema import EventCreate
from app.dependencies.rate_limiter import limiter
from app.core.pagination_params import ListParams, PaginationParams


router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def fetch_events(request: Request, params: ListParams = Depends(), db: AsyncSession = Depends(get_async_db)):
    return await get_events(db, params)


@router.get("/my-events", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def fetch_my_events(request: Request, params: PaginationParams = Depends(), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["lgu_official", "barangay_official"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view your events."
        )
    return await get_my_events(current_user.id, db, params)

@router.get("/{event_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def fetch_event_by_id(request: Request, event_id: int, db: AsyncSession = Depends(get_async_db)):
    return await get_event_by_id(event_id, db)


@router.post("/create", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_event(request: Request, event_data: str = Form(...), event_files: Optional[List[UploadFile]] = File([]), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
  
  parsed_event_data = EventCreate.model_validate_json(event_data)
  return await create_new_event(current_user.id, parsed_event_data, event_files, db)


@router.put("/update/{event_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def update_event_endpoint(request: Request, event_id: int, event_data: str = Form(...), event_files: Optional[List[UploadFile]] = File([]), keep_media_ids: Optional[str] = Form(None), db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    parsed_event_data = EventCreate.model_validate_json(event_data)
    parsed_keep_media_ids = json.loads(keep_media_ids) if keep_media_ids else []
    return await update_event(current_user.id, event_id, parsed_event_data, event_files, parsed_keep_media_ids, db)

@router.delete("/delete/{event_id}", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def delete_event_endpoint(request: Request, event_id: int, db: AsyncSession = Depends(get_async_db), current_user: User = Depends(get_current_user)):
    return await delete_event(current_user.id, event_id, db)
