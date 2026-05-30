"""Auth-domain business logic: credential verification + login stamping.

Modified (§3.8 / §3.9 of USER-MANAGEMENT-PLAN.md) to branch on user status:
- status == "invited" OR password is None → PasswordSetupRequiredError (409)
- status == "disabled"                    → AccountDisabledError (403)
- status == "active" with password set    → verify bcrypt hash as before

Generic UnauthorizedError is preserved for unknown-email and bad-password so
active-user enumeration remains impossible (``owasp-security``).
"""

from __future__ import annotations

from datetime import datetime, timezone

from ...core.errors import (
    AccountDisabledError,
    PasswordSetupRequiredError,
    UnauthorizedError,
)
from ...core.security import verify_password
from ...models import User
from ...schemas.auth import AuthUser, LoginRequest


async def login(payload: LoginRequest) -> AuthUser:
    """Verify credentials, stamp ``lastlogined``, return a client-safe user.

    Status-branching rules (§3.8):
    - Unknown email or bad password → generic 401 (no enumeration).
    - status="invited" or password is None → 409 PASSWORD_SETUP_REQUIRED
      (frontend triggers the OTP first-login flow).
    - status="disabled" → 403 ACCOUNT_DISABLED.
    - status="active" with a valid password → stamp lastlogined + return AuthUser.
    """
    user = await User.find_one(User.emailid == payload.emailid)

    # Unknown email: raise the same generic error as bad password (no enumeration).
    if user is None:
        raise UnauthorizedError("Invalid email or password")

    # Invited / password not yet set → redirect to OTP setup flow.
    if user.status == "invited" or user.password is None:
        raise PasswordSetupRequiredError(
            "Account setup is required. Please check your email for a one-time code."
        )

    # Disabled accounts cannot log in at all.
    if user.status == "disabled":
        raise AccountDisabledError(
            "Your account has been disabled. Please contact an administrator."
        )

    # Active account: verify password (generic error on mismatch — no enumeration).
    if not verify_password(payload.password, user.password):
        raise UnauthorizedError("Invalid email or password")

    user.lastlogined = datetime.now(timezone.utc)
    await user.save()
    return AuthUser(emailid=user.emailid, isAdmin=user.isAdmin, lastlogined=user.lastlogined)
