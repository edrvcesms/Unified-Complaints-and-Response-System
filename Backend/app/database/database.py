from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

_engine = None
_sessionmaker = None

def get_engine():
    global _engine
    if _engine is None:
        print("🔥 Creating NEW engine in process")
        _engine = create_async_engine(
            settings.DATABASE_URL_ASYNC,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            connect_args={
                "ssl": "require",
            },
        )
        
        print("🔥 DB POOL CONFIG")
        print("Pool size:", _engine.pool.size())
        print("Max overflow:", _engine.pool._max_overflow)
        print("Pool timeout:", _engine.pool._timeout)
    return _engine


def get_sessionmaker():
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _sessionmaker


def AsyncSessionLocal():
    return get_sessionmaker()()


Base = declarative_base()