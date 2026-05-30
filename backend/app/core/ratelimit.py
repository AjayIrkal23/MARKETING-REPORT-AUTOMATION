"""In-process rate limiting (sliding window).

A lightweight, dependency-free limiter that protects auth endpoints against
brute-force / credential-stuffing (OWASP A07). Counters live in-process only —
for multi-worker production, back this with a shared store (Redis via
``slowapi`` / ``fastapi-limiter``).
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request

from .errors import RateLimitError


class SlidingWindowLimiter:
    """Allow at most ``max_requests`` per ``window_seconds`` per key."""

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()
        if len(hits) >= self.max_requests:
            raise RateLimitError("Too many attempts. Please try again later.")
        hits.append(now)


# 5 attempts / minute / client IP on the login route.
login_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=60.0)


async def login_rate_limit(request: Request) -> None:
    """FastAPI dependency: throttle login attempts per client IP."""
    client = request.client.host if request.client else "unknown"
    login_limiter.check(client)
