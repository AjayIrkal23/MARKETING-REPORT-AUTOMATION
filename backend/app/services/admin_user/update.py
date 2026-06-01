"""Admin user-management: update name and/or isAdmin flag.

Business rules (contract §3.8 / §3.9):
- Only ``name`` and ``isAdmin`` may be changed (email is the immutable login key).
- If both update fields are ``None`` the document is still re-fetched and the
  current state returned — no no-op error; callers may pass partial updates.
- Raises ``NotFoundError`` for an unknown ``user_id``.
- Returns an ``AdminUserPublic`` DTO.
"""

from __future__ import annotations

import logging

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models import User
from ...schemas.admin_user import AdminUserPublic, UpdateUserRequest, to_admin_user_public
from ..audit.events import audit_user_event

logger = logging.getLogger(__name__)


async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    *,
    actor_email: str | None,
) -> AdminUserPublic:
    """Update a user's ``name`` and/or ``isAdmin`` fields.

    Only the fields explicitly provided (non-``None``) are written; the rest
    of the document is left unchanged (partial update semantics).

    Args:
        user_id:     String representation of the MongoDB ObjectId.
        payload:     Validated ``UpdateUserRequest`` DTO.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if
                     unavailable.

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

    changed = False

    if payload.name is not None:
        user.name = payload.name
        changed = True

    if payload.isAdmin is not None:
        user.isAdmin = payload.isAdmin
        changed = True

    if changed:
        await user.save()
        logger.info(
            "Updated user %s: name=%r, isAdmin=%r.",
            user_id,
            payload.name,
            payload.isAdmin,
        )

    await audit_user_event(
        "user.updated",
        f"Updated user '{user.emailid}'",
        actor_email=actor_email,
        extra={
            "user_id": str(user.id),
            "email": user.emailid,
            "changed": [f for f in ("name", "isAdmin") if getattr(payload, f) is not None],
        },
    )

    return to_admin_user_public(user)
