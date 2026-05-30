"""Branch Wise Report Automation API — application factory.

Thin entry point: builds the FastAPI app, wires CORS, centralized exception
handlers, the MongoDB lifespan (connect + seed), and the aggregated router.
All behavior lives in the routes/controllers/services/schemas layers.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .core.config import get_settings
from .core.database import close_db, init_db
from .core.exception_handlers import register_exception_handlers
from .routes import api_router
from .services.user.seed import seed_admin

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Connect to MongoDB and ensure the seed admin exists on startup.

    Mongo failures are logged but non-fatal so ping/health still boot for local
    development when no database is available.
    """
    try:
        await init_db()
        await seed_admin()
    except Exception:  # noqa: BLE001 — startup must tolerate a missing DB.
        logger.exception("MongoDB init/seed failed; continuing without a database.")
    try:
        yield
    finally:
        await close_db()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title="Branch Wise Report Automation API",
        description="Marketing report automation backend (MongoDB-backed).",
        version=__version__,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
