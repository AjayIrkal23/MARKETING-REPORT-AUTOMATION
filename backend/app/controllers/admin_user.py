"""Admin user-domain controllers (thin: call service, wrap in envelope).

One controller per endpoint; each:
- Receives validated inputs via FastAPI Depends.
- Calls the appropriate service function (all DB/business logic lives there).
- Wraps the result in a ``success()`` envelope.

Unknown query-param rejection on the list endpoint mirrors the pattern in
``controllers/user.py`` (allowed keys: page, limit, sortBy, sortOrder, q,
status, role). Contract: §3.8 / §3.9 of USER-MANAGEMENT-PLAN.md.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.admin_user import (
    AdminUserListQuery,
    AdminUserPublic,
    AsyncOption,
    CreateUserRequest,
    ResetPasswordRequest,
    UpdateUserRequest,
    UserOptionsQuery,
)
from ..schemas.auth import AuthUser
from ..services.admin_user.create import create_user
from ..services.admin_user.delete import delete_user
from ..services.admin_user.disable import disable_user
from ..services.admin_user.enable import enable_user
from ..services.admin_user.get import get_user
from ..services.admin_user.list import list_users
from ..services.admin_user.options import search_options
from ..services.admin_user.reset_password import reset_password
from ..services.admin_user.update import update_user

# Whitelist for the GET /admin/users list endpoint; anything else is rejected.
_ALLOWED_LIST_QUERY_KEYS = {
    "page", "limit", "sortBy", "sortOrder", "q", "status", "role",
}


async def list_users_controller(
    request: Request,
    query: AdminUserListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[AdminUserPublic]]:
    """``GET /admin/users`` — paginated, sorted, filtered user list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_QUERY_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_users(query)
    return success(items, meta=meta)


async def get_options_controller(
    query: UserOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[AsyncOption]]:
    """``GET /admin/users/options`` — async combobox options (≤200)."""
    options = await search_options(query)
    return success(options)


async def create_user_controller(
    payload: CreateUserRequest,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``POST /admin/users`` — create an invited user and send invite email."""
    user = await create_user(payload)
    return success(user, message="User created.")


async def get_user_controller(
    user_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``GET /admin/users/{id}`` — fetch a single user by ObjectId."""
    user = await get_user(user_id)
    return success(user)


async def update_user_controller(
    user_id: str,
    payload: UpdateUserRequest,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``PATCH /admin/users/{id}`` — update name and/or isAdmin flag."""
    user = await update_user(user_id, payload)
    return success(user, message="User updated.")


async def delete_user_controller(
    user_id: str,
    current_admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    """``DELETE /admin/users/{id}`` — delete a user (with self/last-admin guards)."""
    await delete_user(user_id, current_admin.emailid)
    return success(None, message="User deleted.")


async def disable_user_controller(
    user_id: str,
    current_admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``POST /admin/users/{id}/disable`` — disable a user account."""
    user = await disable_user(user_id, current_admin.emailid)
    return success(user, message="User disabled.")


async def enable_user_controller(
    user_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``POST /admin/users/{id}/enable`` — enable a user account."""
    user = await enable_user(user_id)
    return success(user, message="User enabled.")


async def reset_password_controller(
    user_id: str,
    payload: ResetPasswordRequest,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AdminUserPublic]:
    """``POST /admin/users/{id}/reset-password`` — reset or clear a user's password."""
    user = await reset_password(user_id, payload)
    return success(user, message="Password updated.")
