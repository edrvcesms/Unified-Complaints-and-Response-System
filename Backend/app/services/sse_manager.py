import asyncio
import json
from typing import Any
from fastapi.responses import StreamingResponse
import redis.asyncio as aioredis


class SSEManager:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self._redis: aioredis.Redis | None = None

    async def get_redis(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = await aioredis.from_url(self.redis_url)
        return self._redis

    async def send(self, user_id: str, data: Any, event: str = "message"):
        """
        Send a notification to a specific user.

        Args:
            user_id: The target user's ID.
            event:   A string label for the event type. The React Native
                     client uses this to route to the right listener.
            data:    Any JSON-serializable dict.

        Examples:
            # Order update
            await sse_manager.send(
                user_id="user_123",
                event="order_update",
                data={
                    "order_id": "ORD-001",
                    "status": "shipped",
                    "message": "Your order is on the way!"
                }
            )

            # Chat message
            await sse_manager.send(
                user_id="user_123",
                event="new_message",
                data={
                    "from": "user_456",
                    "message": "Hey, are you there?",
                    "timestamp": "2024-01-01T12:00:00Z"
                }
            )

            # General notification
            await sse_manager.send(
                user_id="user_123",
                event="notification",
                data={
                    "title": "Payment Received",
                    "body": "You received $50.00",
                    "type": "success"
                }
            )
        """
        redis = await self.get_redis()
        payload = json.dumps({"event": event, "data": data})
        await redis.publish(f"sse:{user_id}", payload)

    async def broadcast(self, data: Any, event: str = "message"):
        """
        Send a notification to ALL connected users.

        Args:
            event: A string label for the event type.
            data:  Any JSON-serializable dict.

        Examples:
            # System maintenance alert
            await sse_manager.broadcast(
                event="system_alert",
                data={
                    "title": "Scheduled Maintenance",
                    "message": "We'll be down for maintenance at 2AM UTC.",
                    "duration_minutes": 30
                }
            )

            # App-wide announcement
            await sse_manager.broadcast(
                event="announcement",
                data={
                    "title": "New Feature!",
                    "message": "Dark mode is now available.",
                    "url": "/settings/appearance"
                }
            )
        """
        redis = await self.get_redis()
        payload = json.dumps({"event": event, "data": data})
        await redis.publish("sse:broadcast", payload)

    def stream(self, user_id: str):
        """
        Returns a StreamingResponse for the given user.
        Use this directly as the return value of your endpoint.

        The client will receive two types of events:

        1. User-specific events (sent via sse_manager.send):
            {
                "event": "order_update",
                "data": {
                    "order_id": "ORD-001",
                    "status": "shipped"
                }
            }

        2. Broadcast events (sent via sse_manager.broadcast):
            {
                "event": "announcement",
                "data": {
                    "title": "New Feature!",
                    "message": "Dark mode is now available."
                }
            }

        Raw SSE wire format the client receives:
            event: order_update
            data: {"order_id": "ORD-001", "status": "shipped"}

            event: announcement
            data: {"title": "New Feature!", "message": "Dark mode is now available."}

        Example usage in an endpoint:
            @router.get("/notifications/stream")
            async def notifications_stream(current_user = Depends(get_current_user)):
                return sse_manager.stream(current_user.id)
        """
        async def event_generator():
            redis = await self.get_redis()
            pubsub = redis.pubsub()

            await pubsub.subscribe(f"sse:{user_id}", "sse:broadcast")

            try:
                while True:
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=30
                    )
                    if message and message["type"] == "message":
                        payload = json.loads(message["data"])
                        event = payload.get("event", "message")
                        data = json.dumps(payload.get("data", {}))
                        yield f"event: {event}\ndata: {data}\n\n"
                    else:
                        yield ": keepalive\n\n"
                        await asyncio.sleep(1)
            except asyncio.CancelledError:
                pass
            finally:
                await pubsub.unsubscribe(f"sse:{user_id}", "sse:broadcast")
                await pubsub.close()

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )


sse_manager = SSEManager(redis_url="redis://localhost:6379")