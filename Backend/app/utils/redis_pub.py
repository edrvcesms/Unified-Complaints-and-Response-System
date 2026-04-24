import json
import redis.asyncio as aioredis
from app.core.config import settings

redis_client = aioredis.from_url(settings.REDIS_URL)

async def publish_sse_event(channel: str, payload: dict):
    await redis_client.publish(channel, json.dumps(payload))