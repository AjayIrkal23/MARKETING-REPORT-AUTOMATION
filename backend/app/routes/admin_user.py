"""Admin user-management routes.

Router prefix: ``/admin/users``.
All routes are gated by ``get_current_admin`` at the router level — every
endpoint in this module requires an active admin session.

IMPORTANT: ``/options`` is registered BEFORE ``/{id}`` so FastAPI does not
absorb the literal string "options" as an id path parameter.
Contract: §3.8 / §3.9 of USER-MANAGEMENT-PLAN.md.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import admin_user as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.admin_user import AdminUserPublic, AsyncOption

router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(get_current_admin)],
)

# --- Collection-level routes ---

router.add_api_route(
    "",
    ctrl.list_users_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AdminUserPublic]],
    summary="List users (paginated)",
)

# /options MUST be registered before /{id} — FastAPI routes are matched in
# registration order and a literal-string segment must precede a variable one.
router.add_api_route(
    "/options",
    ctrl.get_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox options (≤200)",
)

router.add_api_route(
    "",
    ctrl.create_user_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[AdminUserPublic],
    status_code=201,
    summary="Create an invited user",
)

# --- Item-level routes ---

router.add_api_route(
    "/{user_id}",
    ctrl.get_user_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[AdminUserPublic],
    summary="Get a user by id",
)

router.add_api_route(
    "/{user_id}",
    ctrl.update_user_controller,
    methods=["PATCH"],
    response_model=SuccessEnvelope[AdminUserPublic],
    summary="Update name / isAdmin",
)

router.add_api_route(
    "/{user_id}",
    ctrl.delete_user_controller,
    methods=["DELETE"],
    response_model=SuccessEnvelope[None],
    summary="Delete a user",
)

router.add_api_route(
    "/{user_id}/disable",
    ctrl.disable_user_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[AdminUserPublic],
    summary="Disable a user account",
)

router.add_api_route(
    "/{user_id}/enable",
    ctrl.enable_user_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[AdminUserPublic],
    summary="Enable a user account",
)

router.add_api_route(
    "/{user_id}/reset-password",
    ctrl.reset_password_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[AdminUserPublic],
    summary="Reset or clear a user's password",
)
