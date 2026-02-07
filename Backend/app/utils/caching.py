import redis

# Initialize Redis client
redis_client = redis.Redis(host='localhost', port=6379, db=0)

async def set_cache(key: str, value: str, expiration: int = 3600):
    """Set a value in the cache with an optional expiration time."""
    redis_client.setex(key, expiration, value)

async def get_cache(key: str):
    """Get a value from the cache."""
    return redis_client.get(key)

async def delete_cache(key: str):
    """Delete a value from the cache."""
    redis_client.delete(key)

