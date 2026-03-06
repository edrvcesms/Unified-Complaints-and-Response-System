import asyncio
import json
from typing import Any, Dict, Set
from fastapi.responses import StreamingResponse
import redis.asyncio as aioredis


class SSEManager:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: aioredis.Redis | None = None
        self._connections: Dict[str, Set[asyncio.Queue]] = {}
        self._listener_task: asyncio.Task | None = None
        self._pubsub = None
        self._lock = asyncio.Lock()

    async def connect_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(self.redis_url)
        if not self._listener_task:
            self._listener_task = asyncio.create_task(self._redis_listener())

    async def _redis_listener(self):
        try:
            redis = self._redis
            self._pubsub = redis.pubsub()
            await self._pubsub.subscribe("sse:user", "sse:broadcast")
            async for message in self._pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                    target = payload.get("target")
                    event = payload.get("event", "message")
                    data = payload.get("data", {})
                    formatted = f"event: {event}\ndata: {json.dumps(data)}\n\n"
                    if target == "broadcast":
                        await self._fan_out_all(formatted)
                    else:
                        await self._fan_out_user(str(target), formatted)
                except Exception:
                    continue
        except asyncio.CancelledError:
            pass
        except Exception:
            await asyncio.sleep(1)
            asyncio.create_task(self._redis_listener())

    async def _fan_out_user(self, user_id: str, message: str):
        async with self._lock:
            queues = self._connections.get(user_id, set()).copy()
        for queue in queues:
            await self._safe_put(queue, message)

    async def _fan_out_all(self, message: str):
        async with self._lock:
            all_queues = [queue for queues in self._connections.values() for queue in queues]
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
        await self._redis.publish("sse:user", payload)

    async def broadcast(self, data: Any, event: str = "message"):
        await self.connect_redis()
        payload = json.dumps({"target": "broadcast", "event": event, "data": data})
        await self._redis.publish("sse:broadcast", payload)

    async def stream(self, user_id: str | int):
        await self.connect_redis()
        user_id = str(user_id)
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)

        async def event_generator():
            try:
                while True:
                    try:
                        message = await asyncio.wait_for(queue.get(), timeout=30)
                        yield message
                    except asyncio.TimeoutError:
                        yield ": keepalive\n\n"
            except asyncio.CancelledError:
                pass
            finally:
                async with self._lock:
                    self._connections[user_id].remove(queue)
                    if not self._connections[user_id]:
                        del self._connections[user_id]

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    async def disconnect(self):
        if self._listener_task:
            self._listener_task.cancel()
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()
            self._redis = None


sse_manager = SSEManager(redis_url="redis://localhost:6379")