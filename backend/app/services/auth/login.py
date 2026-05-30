"""Auth-domain business logic: credential verification + login stamping."""

from __future__ import annotations

from datetime import datetime, timezone

from ...core.errors import UnauthorizedError
from ...core.security import verify_password
from ...models import User
from ...schemas.auth import AuthUser, LoginRequest


async def login(payload: LoginRequest) -> AuthUser:
    """Verify credentials, stamp ``lastlogined``, return a client-safe user.

    Uses a single generic error for both unknown-email and bad-password to avoid
    user enumeration (``owasp-security``).
    """
    user = await User.find_one(User.emailid == payload.emailid)
    if user is None or not verify_password(payload.password, user.password):
        raise UnauthorizedError("Invalid email or password")

    user.lastlogined = datetime.now(timezone.utc)
    await user.save()
    return AuthUser(emailid=user.emailid, isAdmin=user.isAdmin, lastlogined=user.lastlogined)
