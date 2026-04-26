import asyncio
import atexit

_worker_loop: asyncio.AbstractEventLoop | None = None


def get_worker_loop() -> asyncio.AbstractEventLoop:
    """
    Returns a single reusable event loop per Celery worker process.

    All async tasks must use this loop to ensure asyncpg, Redis, and
    other async clients stay bound to the same loop they were created on.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop


def run_async(coro):
    """Convenience wrapper — runs a coroutine on the shared worker loop."""
    return get_worker_loop().run_until_complete(coro)


@atexit.register
def _close_worker_loop() -> None:
    global _worker_loop
    if _worker_loop and not _worker_loop.is_closed():
        _worker_loop.close()