from app.database.database import AsyncSessionLocal, SessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from typing import AsyncGenerator, Generator

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

# def get_db() -> Generator[Session, None, None]:
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()