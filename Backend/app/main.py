from fastapi import FastAPI
from fastapi.requests import Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.database import engine, Base
from slowapi.errors import RateLimitExceeded
from app.utils.logger import logger

# Routers
from app.routers import auth_routes, user_routes

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

# Include Routers
app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(user_routes.router, prefix="/api/v1/users", tags=["Users"])

