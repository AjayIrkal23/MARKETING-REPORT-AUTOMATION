"""Admin user-domain business logic: single-user fetch by ObjectId.

Contract: §3.8 / §3.9 of USER-MANAGEMENT-PLAN.md.
``GET /admin/users/{id}`` — parses the route param as a ``PydanticObjectId``
and raises ``NotFoundError`` for both a malformed id string and a missing
document, so the caller never distinguishes the two (no user enumeration,
``owasp-security``).
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ...core.errors import NotFoundError
from ...models.user import User
from ...schemas.admin_user import AdminUserPublic, to_admin_user_public


async def get_user(user_id: str) -> AdminUserPublic:
    """Fetch a single user by string-encoded ObjectId and return the public DTO.

    Raises:
        NotFoundError: when ``user_id`` is not a valid ObjectId string or when
            no document with that id exists in the collection.  The same error
            type is used for both cases so callers cannot enumerate whether an
            id is syntactically invalid or simply absent (``owasp-security``).
    """
    try:
        oid = PydanticObjectId(user_id)
    except Exception:
        raise NotFoundError(f"User '{user_id}' not found.")

    doc: User | None = await User.get(oid)
    if doc is None:
        raise NotFoundError(f"User '{user_id}' not found.")

    return to_admin_user_public(doc)
