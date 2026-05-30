"""User routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import user as user_ctrl
from ..core.auth_deps import get_current_user
from ..core.responses import SuccessEnvelope
from ..schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])

# Protected: requires a valid session cookie (get_current_user -> 401 otherwise).
router.add_api_route(
    "", user_ctrl.list_users_controller, methods=["GET"],
    dependencies=[Depends(get_current_user)],
    response_model=SuccessEnvelope[list[UserPublic]],
)
