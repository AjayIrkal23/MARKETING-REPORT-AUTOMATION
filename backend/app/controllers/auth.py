"""Auth-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser, LoginRequest
from ..services.auth.login import login as login_service


async def login_controller(payload: LoginRequest) -> SuccessEnvelope[AuthUser]:
    user = await login_service(payload)
    return success(user, message="Login successful")
