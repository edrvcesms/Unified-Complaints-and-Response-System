from fastapi import FastAPI
from fastapi.requests import Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.database import engine, Base
from slowapi.errors import RateLimitExceeded
from app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
  async with engine.begin() as conn:
    logger.info("Creating database tables...")
    await conn.run_sync(Base.metadata.create_all)
  logger.info("Application startup complete.")
  yield
  logger.info("Application shutdown complete.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )
logger.info("FastAPI application initialized.")

from sqlalchemy import text

@app.get("/health/db")
async def db_health_check():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "database": "not connected"},
        )