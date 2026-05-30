"""Admin user-management: delete a user document.

Business rules (contract §2 / §3.8 / §3.9):
- **Self guard**: an admin cannot delete their own account.
- **Last-active-admin guard**: if the target is an admin and they are the only
  remaining ``isAdmin=True`` + ``status='active'`` user, deletion is refused.
- Raises ``NotFoundError`` for an unknown ``user_id``.
- Raises ``ForbiddenError`` when either guard fires.
- Returns ``None`` on success (the endpoint responds with ``data=null``).
"""

from __future__ import annotations

import logging

from beanie import PydanticObjectId

from ...core.errors import ForbiddenError, NotFoundError
from ...models import User

logger = logging.getLogger(__name__)

_SELF_DELETE_MSG = "You cannot delete your own account."
_LAST_ADMIN_MSG = "Cannot delete the last active administrator."


async def delete_user(
    user_id: str,
    current_admin_email: str,
) -> None:
    """Delete a user document by id.

    Args:
        user_id:             String representation of the MongoDB ObjectId.
        current_admin_email: Email of the acting admin (for the self guard).

    Returns:
        ``None`` on success.

    Raises:
        NotFoundError:  If no user with the given id exists.
        ForbiddenError: If the self guard or last-active-admin guard fires.
    """
    try:
        oid = PydanticObjectId(user_id)
    except Exception:
        raise NotFoundError("User not found.")

    user: User | None = await User.get(oid)
    if user is None:
        raise NotFoundError("User not found.")

    # Self guard.
    if user.emailid == current_admin_email:
        raise ForbiddenError(_SELF_DELETE_MSG)

    # Last-active-admin guard.
    if user.isAdmin and user.status == "active":
        active_admin_count = await User.find(
            User.isAdmin == True,  # noqa: E712
            User.status == "active",
        ).count()
        if active_admin_count <= 1:
            raise ForbiddenError(_LAST_ADMIN_MSG)

    await user.delete()
    logger.info(
        "Admin %s deleted user %s (%s).",
        current_admin_email,
        user_id,
        user.emailid,
    )
