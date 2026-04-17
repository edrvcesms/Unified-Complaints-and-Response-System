from app.database.database import AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import InterfaceError, OperationalError
from typing import AsyncGenerator

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        # A dropped DB connection can make rollback fail during request teardown.
        try:
            await session.rollback()
        except (InterfaceError, OperationalError):
            pass
        raise
    finally:
        # Do not let close-time disconnect errors bubble up as ASGI exceptions.
        try:
            await session.close()
        except (InterfaceError, OperationalError):
            pass
