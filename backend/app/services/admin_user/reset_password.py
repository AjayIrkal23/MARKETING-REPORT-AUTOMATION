"""Admin user-management: reset (or clear) a user's password.

Business rules (contract §2 / §3.8 / §3.9):
- ``newPassword`` provided → hash it, store it, set ``status='active'``.
- ``newPassword`` omitted (``None``) → null the password, set ``status='invited'``
  (forces the user through OTP first-login setup again).
- OTP fields are cleared in either case so any outstanding OTP is invalidated.
- Raises ``NotFoundError`` for an unknown ``user_id``.
- Returns an ``AdminUserPublic`` DTO.
"""

from __future__ import annotations

import logging

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...core.security import hash_password
from ...models import User
from ...schemas.admin_user import AdminUserPublic, ResetPasswordRequest, to_admin_user_public

logger = logging.getLogger(__name__)


async def reset_password(
    user_id: str,
    payload: ResetPasswordRequest,
) -> AdminUserPublic:
    """Reset or clear a user's password.

    When ``payload.newPassword`` is provided the account is set to ``'active'``;
    when omitted the password is nulled and the account reverts to ``'invited'``
    forcing OTP re-setup.

    Args:
        user_id: String representation of the MongoDB ObjectId.
        payload: Validated ``ResetPasswordRequest`` DTO.

    Returns:
        The updated user as an ``AdminUserPublic`` DTO.

    Raises:
        NotFoundError: If no user document with the given id exists.
    """
    try:
        oid = PydanticObjectId(user_id)
    except Exception:
        raise NotFoundError("User not found.")

    user: User | None = await User.get(oid)
    if user is None:
        raise NotFoundError("User not found.")

    if payload.newPassword is not None:
        # Admin sets an explicit password → account becomes active immediately.
        user.password = hash_password(payload.newPassword)
        user.status = "active"  # type: ignore[assignment]
        action = "set password (status→active)"
    else:
        # No password supplied → wipe credentials so the user re-does OTP setup.
        user.password = None
        user.status = "invited"  # type: ignore[assignment]
        action = "cleared password (status→invited)"

    # Invalidate any outstanding OTP regardless of the chosen path.
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.otp_last_sent_at = None

    await user.save()

    logger.info(
        "Admin reset password for user %s (%s): %s.",
        user_id,
        user.emailid,
        action,
    )

    return to_admin_user_public(user)
