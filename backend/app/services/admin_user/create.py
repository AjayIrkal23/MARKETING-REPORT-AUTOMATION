"""Admin user-management: create an invited user.

Business rules (contract §3.8 / §3.9):
- ``password`` is always ``None``; ``status`` is always ``"invited"``.
- Raises ``ConflictError`` if the email already exists (unique index).
- Sends an invitation email via ``core.email`` after persisting the document;
  email failures are swallowed (logged only) so the record is still created.
- Returns an ``AdminUserPublic`` DTO (never the raw document).
"""

from __future__ import annotations

import logging

from pymongo.errors import DuplicateKeyError

from ...core.config import get_settings
from ...core.email import render_invite_email, send_email
from ...core.errors import ConflictError
from ...models import User
from ...schemas.admin_user import AdminUserPublic, CreateUserRequest, to_admin_user_public
from ..audit.events import audit_user_event

logger = logging.getLogger(__name__)


async def create_user(
    payload: CreateUserRequest,
    *,
    actor_email: str | None,
) -> AdminUserPublic:
    """Create a new user in the ``invited`` state and send an invitation email.

    The caller (controller) is responsible for authentication gating — this
    function performs only business and persistence logic.

    Args:
        payload:     Validated ``CreateUserRequest`` DTO (name, emailid, isAdmin).
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if
                     unavailable.

    Returns:
        The persisted user as an ``AdminUserPublic`` DTO.

    Raises:
        ConflictError: If a user with the given email already exists.
    """
    settings = get_settings()

    user = User(
        emailid=payload.emailid,
        name=payload.name,
        password=None,         # no password until OTP setup completes
        status="invited",
        isAdmin=payload.isAdmin,
    )

    try:
        await user.insert()
    except DuplicateKeyError:
        raise ConflictError(
            f"A user with email '{payload.emailid}' already exists."
        )

    logger.info(
        "Admin created user %s (isAdmin=%s).", payload.emailid, payload.isAdmin
    )

    await audit_user_event(
        "user.created",
        f"Created user '{user.emailid}'",
        actor_email=actor_email,
        extra={"user_id": str(user.id), "email": user.emailid},
    )

    # Send invite — failure must not abort the successful creation.
    try:
        subject, text, html = render_invite_email(
            name=payload.name,
            app_name=settings.app_name,
            app_base_url=settings.app_base_url,
        )
        await send_email(to=payload.emailid, subject=subject, text=text, html=html)
    except Exception:
        logger.exception(
            "Invite email dispatch failed for %s — user was still created.",
            payload.emailid,
        )

    return to_admin_user_public(user)
