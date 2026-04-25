from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncEngine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

async_engine = create_async_engine(
    settings.DATABASE_URL_ASYNC,
    # Connection pool configuration for optimal performance
    pool_size=20,              # Base pool size for typical concurrent requests
    max_overflow=30,           # Additional connections for burst traffic
    pool_timeout=30,           # Wait up to 30s for available connection
    pool_recycle=3600,         # Recycle connections every hour (prevent idle connection issues)
    pool_pre_ping=True,        # Verify connection health before using (prevents "connection lost" errors)
    pool_use_lifo=True,        # LIFO stack for better connection reuse (hot connections)
    echo=False,                # Set to True only for debugging SQL queries
    # Additional performance settings
    connect_args={
        "timeout": 30,         # Connection timeout
        "server_settings": {
            "jit": "off",      # Disable JIT compilation for predictable performance
        }
    }
    )
AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()