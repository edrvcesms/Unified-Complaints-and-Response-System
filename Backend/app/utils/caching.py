import json
from app.core.redis import redis_client  # assume redis.asyncio.Redis for async
from app.utils.logger import logger

async def set_cache(key: str, value, expiration: int):
    """Set a value in Redis cache with optional expiration (seconds)."""
    try:
        await redis_client.setex(key, expiration, json.dumps(value))
    except Exception as e:
        logger.warning(f"Failed to set cache for {key}: {e}")

import json

async def get_cache(key: str):
    """Get a value from Redis cache. Returns Python object or None."""
    try:
        data = await redis_client.get(key)
        if not data:
            return None
        if isinstance(data, bytes):
            data = data.decode("utf-8")
        return json.loads(data)
    except Exception as e:
        logger.warning(f"Failed to get cache for {key}: {e}")
        return None

async def delete_cache(key: str):
    """Delete a key from Redis."""
    try:
        await redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Failed to delete cache for {key}: {e}")
