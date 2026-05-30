"""Admin user-management: enable (un-disable) a user account.

Business rules (contract §3.8 / §3.9):
- If the user has a password set → ``status = 'active'``.
- If the user has no password (``None``) → ``status = 'invited'`` so they must
  complete OTP setup before they can log in.
- Raises ``NotFoundError`` for an unknown ``user_id``.
- Returns an ``AdminUserPublic`` DTO.
"""

from __future__ import annotations

import logging

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models import User
from ...schemas.admin_user import AdminUserPublic, to_admin_user_public

logger = logging.getLogger(__name__)


async def enable_user(user_id: str) -> AdminUserPublic:
    """Enable a user account by setting the appropriate status.

    The new status depends on whether the user has a password:
    - Password present → ``'active'``
    - No password (never completed OTP setup) → ``'invited'``

    Args:
        user_id: String representation of the MongoDB ObjectId.

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

    new_status = "active" if user.password is not None else "invited"
    user.status = new_status  # type: ignore[assignment]
    await user.save()

    logger.info(
        "Enabled user %s (%s) → status='%s'.",
        user_id,
        user.emailid,
        new_status,
    )

    return to_admin_user_public(user)
