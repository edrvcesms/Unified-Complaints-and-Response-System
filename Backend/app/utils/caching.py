import redis
from app.core.config import settings

# Initialize Redis client
redis_client = redis.Redis.from_url(settings.REDIS_URL)

def set_cache(key: str, value: str, expiration: int = 3600):
    """Set a value in the cache with an optional expiration time."""
    redis_client.setex(key, expiration, value)

def get_cache(key: str):
    """Get a value from the cache."""
    return redis_client.get(key)

def delete_cache(key: str):
    """Delete a value from the cache."""
    redis_client.delete(key)

