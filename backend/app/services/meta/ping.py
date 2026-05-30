"""Meta-domain business logic: service banner, health, ping counter."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from itertools import count

from ... import __version__
from ...schemas.meta import HealthData, PingData, RootData

_START_TIME = time.monotonic()
_ping_counter = count(1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_root() -> RootData:
    return RootData(
        service="Branch Wise Report Automation API",
        version=__version__,
        docs="/docs",
        ping="/ping",
    )


def get_health() -> HealthData:
    return HealthData(
        status="ok",
        version=__version__,
        uptime_seconds=round(time.monotonic() - _START_TIME, 3),
    )


def next_ping() -> PingData:
    return PingData(message="pong", seq=next(_ping_counter), timestamp=_now_iso())
