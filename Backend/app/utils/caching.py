import json
from collections.abc import Mapping
from urllib.parse import urlencode
from app.core.redis import redis_client  # assume redis.asyncio.Redis for async
from app.utils.logger import logger

DEFAULT_LIST_CACHE_TTL_SECONDS = 300
EMPTY_LIST_CACHE_TTL_SECONDS = 60


def build_list_cache_key(resource: str, params: Mapping[str, object], **scope: object) -> str:
    """Build a deterministic, pagination-aware cache key for a collection.

    Keys include page parameters and all active filters.  Scope values (such as
    a current user or barangay) keep authorization-specific collections apart.
    """
    values = {**scope, **{key: value for key, value in params.items() if value is not None}}
    return f"{resource}:{urlencode(sorted((key, str(value)) for key, value in values.items()))}"


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


async def delete_cache_prefix(resource: str) -> int:
    """Invalidate only the paginated collection keys for one resource.

    ``SCAN`` avoids Redis's blocking ``KEYS`` command.  Writers call this after
    mutations so every cached page/filter/sort variant of that resource is
    removed without affecting unrelated resources.
    """
    deleted = 0
    try:
        async for key in redis_client.scan_iter(match=f"{resource}:*"):
            deleted += int(await redis_client.delete(key))
    except Exception as e:
        logger.warning(f"Failed to invalidate cache resource {resource}: {e}")
    return deleted
