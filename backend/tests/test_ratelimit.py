"""Sliding-window login rate limiter."""

from __future__ import annotations

import pytest

from app.core.errors import RateLimitError
from app.core.ratelimit import SlidingWindowLimiter


def test_allows_up_to_limit() -> None:
    limiter = SlidingWindowLimiter(max_requests=3, window_seconds=60)
    for _ in range(3):
        limiter.check("1.2.3.4")  # must not raise


def test_blocks_over_limit() -> None:
    limiter = SlidingWindowLimiter(max_requests=2, window_seconds=60)
    limiter.check("ip")
    limiter.check("ip")
    with pytest.raises(RateLimitError):
        limiter.check("ip")


def test_keys_are_isolated() -> None:
    limiter = SlidingWindowLimiter(max_requests=1, window_seconds=60)
    limiter.check("a")
    limiter.check("b")  # different client key — allowed
    with pytest.raises(RateLimitError):
        limiter.check("a")
