"""User routes."""

from __future__ import annotations

from fastapi import APIRouter

from ..controllers import user as user_ctrl
from ..core.responses import SuccessEnvelope
from ..schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])

router.add_api_route(
    "", user_ctrl.list_users_controller, methods=["GET"],
    response_model=SuccessEnvelope[list[UserPublic]],
)
