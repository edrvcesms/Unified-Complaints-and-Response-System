# app/core/redis.py
from redis.asyncio import Redis
from app.core.config import settings

# Async Redis client
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
