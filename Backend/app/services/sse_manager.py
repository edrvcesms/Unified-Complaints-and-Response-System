import asyncio
import json
from typing import Any, Dict, Set
from fastapi.responses import StreamingResponse
import redis.asyncio as aioredis
from app.core.config import settings
from app.utils.logger import logger


class SSEManager:
    def __init__(self, redis_url: str = settings.REDIS_URL):
        self.redis_url = redis_url
        self._redis: aioredis.Redis | None = None
        self._connections: Dict[str, Set[asyncio.Queue]] = {}
        self._listener_task: asyncio.Task | None = None
        self._pubsub = None
        self._lock = asyncio.Lock()

    async def connect_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(self.redis_url)
        else:
            try:
                await self._redis.ping()
            except Exception:
                self._redis = await aioredis.from_url(self.redis_url)
                
        if not self._redis:
            logger.info(f"SSE Redis connect attempt. redis_url={self.redis_url}")
            self._redis = await aioredis.from_url(self.redis_url)
            logger.info("Connected to Redis for SSEManager.")
        if not self._listener_task:
            self._listener_task = asyncio.create_task(self._redis_listener())
            logger.info("Started Redis listener task for SSEManager.")

    async def _redis_listener(self):
        try:
            redis = self._redis
            self._pubsub = redis.pubsub()
            await self._pubsub.subscribe("sse:user", "sse:broadcast")
            logger.info("Subscribed to Redis channels for SSEManager.")
            async for message in self._pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                    target = payload.get("target")
                    event = payload.get("event", "message")
                    data = payload.get("data", {})
                    logger.info(
                        "SSE Redis message received. "
                        f"channel={message.get('channel')} target={target} event={event}"
                    )
                    formatted = f"event: {event}\ndata: {json.dumps(data)}\n\n"
                    if target == "broadcast":
                        await self._fan_out_all(formatted)
                    else:
                        await self._fan_out_user(str(target), formatted)
                except Exception as e:
                    logger.exception(f"Error processing SSE message: {e}")
                    continue
        except asyncio.CancelledError:
            logger.info("SSE Redis listener task cancelled.")
        except Exception as e:
            logger.exception(f"Error in SSE listener: {e}")
            await asyncio.sleep(1)
            logger.info("Restarting SSE Redis listener task after failure.")
            self._listener_task = asyncio.create_task(self._redis_listener())

    async def _fan_out_user(self, user_id: str, message: str):
        async with self._lock:
            queues = self._connections.get(user_id, set()).copy()
        logger.info(f"SSE fan-out to user. user_id={user_id} subscribers={len(queues)}")
        for queue in queues:
            await self._safe_put(queue, message)

    async def _fan_out_all(self, message: str):
        async with self._lock:
            all_queues = [queue for queues in self._connections.values() for queue in queues]
        logger.info(f"SSE broadcast fan-out. subscribers={len(all_queues)}")
        for queue in all_queues:
            await self._safe_put(queue, message)

    async def _safe_put(self, queue: asyncio.Queue, message: str):
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            pass

    async def send(self, user_id: str | int, data: Any, event: str = "message"):
        await self.connect_redis()
        payload = json.dumps({"target": str(user_id), "event": event, "data": data})
        listeners = await self._redis.publish("sse:user", payload)
        logger.info(
            f"SSE publish user event. user_id={user_id} event={event} redis_listeners={listeners}"
        )

    async def broadcast(self, data: Any, event: str = "message"):
        await self.connect_redis()
        payload = json.dumps({"target": "broadcast", "event": event, "data": data})
        listeners = await self._redis.publish("sse:broadcast", payload)
        logger.info(f"SSE publish broadcast event. event={event} redis_listeners={listeners}")

    async def stream(self, user_id: str | int):
        await self.connect_redis()
        user_id = str(user_id)
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)
            user_subscribers = len(self._connections[user_id])
            total_subscribers = sum(len(queues) for queues in self._connections.values())
        logger.info(
            "SSE stream opened. "
            f"user_id={user_id} user_subscribers={user_subscribers} total_subscribers={total_subscribers}"
        )

        async def event_generator():
            try:
                while True:
                    try:
                        message = await asyncio.wait_for(queue.get(), timeout=30)
                        yield message
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
            except asyncio.CancelledError:
                logger.info(f"SSE stream cancelled by client disconnect. user_id={user_id}")
            finally:
                async with self._lock:
                    self._connections[user_id].remove(queue)
                    if not self._connections[user_id]:
                        del self._connections[user_id]
                    remaining_user_subscribers = len(self._connections.get(user_id, set()))
                    remaining_total_subscribers = sum(len(queues) for queues in self._connections.values())
                logger.info(
                    "SSE stream closed. "
                    f"user_id={user_id} user_subscribers={remaining_user_subscribers} "
                    f"total_subscribers={remaining_total_subscribers}"
                )

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    async def disconnect(self):
        logger.info("SSE manager disconnect requested.")
        if self._listener_task:
            self._listener_task.cancel()
        if self._pubsub:
            await self._pubsub.close()
            logger.info("SSE Redis pubsub closed.")
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("SSE Redis connection closed.")


sse_manager = SSEManager()