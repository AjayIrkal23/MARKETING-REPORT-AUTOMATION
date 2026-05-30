"""User-domain business logic: idempotent admin seeding."""

from __future__ import annotations

import logging

from ...core.config import get_settings
from ...core.security import hash_password
from ...models import User

logger = logging.getLogger(__name__)


async def seed_admin() -> User | None:
    """Create the seed admin if absent; return the (existing or new) document.

    Idempotent — keyed on the unique ``emailid``. Returns ``None`` (and logs a
    warning) when ``SEED_ADMIN_PASSWORD`` is unset, so no known-password admin is
    ever provisioned from a source default.
    """
    settings = get_settings()
    if not settings.seed_admin_password:
        logger.warning("SEED_ADMIN_PASSWORD not set; skipping admin seed.")
        return None

    existing = await User.find_one(User.emailid == settings.seed_admin_email)
    if existing is not None:
        logger.info("Admin %s already exists; skipping seed.", settings.seed_admin_email)
        return existing

    admin = User(
        emailid=settings.seed_admin_email,
        password=hash_password(settings.seed_admin_password),
        isAdmin=True,
    )
    await admin.insert()
    logger.info("Seeded admin user %s.", settings.seed_admin_email)
    return admin
