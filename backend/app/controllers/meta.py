"""Meta-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from ..core.responses import SuccessEnvelope, success
from ..schemas.meta import HealthData, PingData, RootData
from ..services.meta import ping as meta_service


async def root_controller() -> SuccessEnvelope[RootData]:
    return success(meta_service.get_root())


async def health_controller() -> SuccessEnvelope[HealthData]:
    return success(meta_service.get_health())


async def ping_controller() -> SuccessEnvelope[PingData]:
    return success(meta_service.next_ping(), message="pong")
