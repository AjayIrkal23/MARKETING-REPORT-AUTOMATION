"""Admin user-management: disable a user account.

Business rules (contract §2 / §3.8 / §3.9):
- Sets ``status = 'disabled'``; the user can no longer log in.
- **Self guard**: an admin cannot disable their own account.
- **Last-active-admin guard**: if the target is an admin and they are the only
  remaining ``isAdmin=True`` + ``status='active'`` user, disabling is refused.
- Raises ``NotFoundError`` for an unknown ``user_id``.
- Raises ``ForbiddenError`` when either guard fires.
- Returns an ``AdminUserPublic`` DTO.
"""

from __future__ import annotations

import logging

from beanie import PydanticObjectId

from ...core.errors import ForbiddenError, NotFoundError
from ...models import User
from ...schemas.admin_user import AdminUserPublic, to_admin_user_public
from ..audit.events import audit_user_event

logger = logging.getLogger(__name__)

_SELF_DISABLE_MSG = "You cannot disable your own account."
_LAST_ADMIN_MSG = "Cannot disable the last active administrator."


async def disable_user(
    user_id: str,
    current_admin_email: str,
) -> AdminUserPublic:
    """Disable a user account.

    Args:
        user_id:             String representation of the MongoDB ObjectId.
        current_admin_email: Email of the acting admin (for the self guard).

    Returns:
        The updated user as an ``AdminUserPublic`` DTO.

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
        raise ForbiddenError(_SELF_DISABLE_MSG)

    # Last-active-admin guard — only relevant when the target is currently active.
    if user.isAdmin and user.status == "active":
        active_admin_count = await User.find(
            User.isAdmin == True,  # noqa: E712
            User.status == "active",
        ).count()
        if active_admin_count <= 1:
            raise ForbiddenError(_LAST_ADMIN_MSG)

    user.status = "disabled"
    await user.save()

    logger.info(
        "Admin %s disabled user %s (%s).",
        current_admin_email,
        user_id,
        user.emailid,
    )

    await audit_user_event(
        "user.disabled",
        f"Disabled user '{user.emailid}'",
        actor_email=current_admin_email,
        extra={"user_id": user_id, "email": user.emailid},
    )

    return to_admin_user_public(user)
