from fastapi import FastAPI
from fastapi.requests import Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.database import async_engine, Base
from slowapi.errors import RateLimitExceeded
from app.utils.logger import logger

# Routers
from app.routers import user_auth_routes, user_routes, barangay_routes, complaint_routes, barangay_auth_routes



from app.admin import _super_admin_routes as _super_admin

@asynccontextmanager
async def lifespan(app: FastAPI):
  async with async_engine.begin() as conn:
    logger.info("Creating database tables...")
    await conn.run_sync(Base.metadata.create_all)
  logger.info("Application startup complete.")
  yield
  logger.info("Application shutdown complete.")

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
# Include Routers
app.include_router(_super_admin.router, prefix="/api/v1/super-admin", tags=["Super Admin"])
app.include_router(barangay_auth_routes.router, prefix="/api/v1/barangay-auth", tags=["Barangay Authentication"])

app.include_router(barangay_routes.router, prefix="/api/v1/barangays", tags=["Barangays"])

app.include_router(user_auth_routes.router, prefix="/api/v1/auth", tags=["User Authentication"])
app.include_router(user_routes.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(complaint_routes.router, prefix="/api/v1/complaints", tags=["Complaints"])
