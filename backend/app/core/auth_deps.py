"""Auth dependencies — resolve the current user from the session cookie."""

from __future__ import annotations

from fastapi import Depends, Request

from .config import get_settings
from .errors import ForbiddenError, UnauthorizedError
from .sessions import decode_session_token
from ..models import User
from ..schemas.auth import AuthUser


async def get_current_user(request: Request) -> AuthUser:
    """Return the authenticated user from the httpOnly session cookie.

    Raises ``UnauthorizedError`` (401) when the cookie is missing/invalid or the
    user no longer exists. Used as a route dependency to gate protected routes.
    """
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise UnauthorizedError("Not authenticated")
    emailid = decode_session_token(token, settings)
    user = await User.find_one(User.emailid == emailid)
    if user is None:
        raise UnauthorizedError("Not authenticated")
    return AuthUser(emailid=user.emailid, isAdmin=user.isAdmin, lastlogined=user.lastlogined)


async def get_current_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """Return the authenticated user only if they are an admin.

    Chains on ``get_current_user`` (inherits 401 on missing/invalid session).
    Raises ``ForbiddenError`` (403) when the resolved user is not an admin.
    Used as a route dependency to gate all ``/admin/*`` routes. Contract: §3.6.
    """
    if not current_user.isAdmin:
        raise ForbiddenError("Admin access required")
    return current_user
