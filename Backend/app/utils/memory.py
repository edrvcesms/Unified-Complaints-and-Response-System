import os
import time
import psutil

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


process = psutil.Process(os.getpid())


def get_memory_mb() -> float:
    return process.memory_info().rss / 1024 / 1024


class MemoryMonitoringMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        memory_before = get_memory_mb()
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            return response

        finally:
            memory_after = get_memory_mb()
            elapsed = time.perf_counter() - start_time

            memory_change = memory_after - memory_before

            print(
                f"[MEMORY] "
                f"{request.method} {request.url.path} | "
                f"Before: {memory_before:.2f} MB | "
                f"After: {memory_after:.2f} MB | "
                f"Change: {memory_change:+.2f} MB | "
                f"Time: {elapsed:.2f}s"
            )