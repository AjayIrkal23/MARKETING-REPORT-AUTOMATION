"""CLI entry point to seed the admin user.

Run from ``backend/``:  ``./.venv/bin/python -m app.scripts.seed``
Idempotent — safe to run repeatedly.
"""

from __future__ import annotations

import asyncio
import logging

from ..core.database import close_db, init_db
from ..services.user.seed import seed_admin


async def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    await init_db()
    try:
        await seed_admin()
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(_main())
