from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.user_schema import UserPersonalData
from app.models.user import User
from sqlalchemy import update
from fastapi.responses import JSONResponse

async def update_user_data(user_id: int, user_data: UserPersonalData, db: AsyncSession):
    
    statement = (update(User).where(User.id == user_id).values(**user_data.dict(exclude_unset=True)).execution_options(synchronize_session="fetch").returning(User))

    result = await db.execute(statement)
    updated_user = result.fetchone()

    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    await db.commit()
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "User data updated successfully"}
    )