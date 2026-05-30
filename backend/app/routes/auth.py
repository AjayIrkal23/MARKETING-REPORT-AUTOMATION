"""Auth routes."""

from __future__ import annotations

from fastapi import APIRouter

from ..controllers import auth as auth_ctrl
from ..core.responses import SuccessEnvelope
from ..schemas.auth import AuthUser

router = APIRouter(prefix="/auth", tags=["auth"])

router.add_api_route(
    "/login", auth_ctrl.login_controller, methods=["POST"],
    response_model=SuccessEnvelope[AuthUser],
)
