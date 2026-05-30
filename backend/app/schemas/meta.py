"""Meta-domain response DTOs (root banner, health, ping)."""

from __future__ import annotations

from pydantic import BaseModel


class RootData(BaseModel):
    service: str
    version: str
    docs: str
    ping: str


class HealthData(BaseModel):
    status: str = "ok"
    version: str
    uptime_seconds: float


class PingData(BaseModel):
    message: str = "pong"
    seq: int
    timestamp: str
