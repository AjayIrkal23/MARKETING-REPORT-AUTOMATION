"""User-domain business logic: idempotent admin seeding."""

from __future__ import annotations

import logging

from ...core.config import get_settings
from ...core.security import hash_password
from ...models import User

logger = logging.getLogger(__name__)

_ADMIN_NAME = "Administrator"


async def seed_admin() -> User | None:
    """Create the seed admin if absent; return the (existing or new) document.

    Idempotent — keyed on the unique ``emailid``. Returns ``None`` (and logs a
    warning) when ``SEED_ADMIN_PASSWORD`` is unset, so no known-password admin is
    ever provisioned from a source default.

    **Backfill**: if the admin doc already exists but was created before the
    ``status`` / ``name`` fields were introduced (Phase B1), this function sets
    ``status="active"``, ``name="Administrator"``, and ``isAdmin=True`` so the
    existing admin can still log in after the model migration.
    """
    settings = get_settings()
    if not settings.seed_admin_password:
        logger.warning("SEED_ADMIN_PASSWORD not set; skipping admin seed.")
        return None

    existing = await User.find_one(User.emailid == settings.seed_admin_email)
    if existing is not None:
        # Backfill fields introduced in Phase B1 if they are missing/default.
        needs_save = False

        if existing.status != "active":
            existing.status = "active"
            needs_save = True

        if not existing.name:
            existing.name = _ADMIN_NAME
            needs_save = True

        if not existing.isAdmin:
            existing.isAdmin = True
            needs_save = True

        if needs_save:
            await existing.save()
            logger.info(
                "Backfilled admin %s: status=active, name=%s, isAdmin=True.",
                settings.seed_admin_email,
                _ADMIN_NAME,
            )
        else:
            logger.info(
                "Admin %s already exists and is current; skipping seed.",
                settings.seed_admin_email,
            )
        return existing

    admin = User(
        emailid=settings.seed_admin_email,
        name=_ADMIN_NAME,
        password=hash_password(settings.seed_admin_password),
        status="active",
        isAdmin=True,
    )
    await admin.insert()
    logger.info("Seeded admin user %s.", settings.seed_admin_email)
    return admin
