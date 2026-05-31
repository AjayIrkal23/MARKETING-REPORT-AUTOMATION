"""Branch Wise Report Automation API — application factory.

Thin entry point: builds the FastAPI app, wires CORS, centralized exception
handlers, the MongoDB lifespan (connect + seed), and the aggregated router.
All behavior lives in the routes/controllers/services/schemas layers.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .core.config import get_settings
from .core.database import close_db, init_db
from .core.exception_handlers import register_exception_handlers
from .core.scheduler import shutdown_scheduler, start_scheduler
from .middleware.audit import AuditMiddleware
from .routes import api_router
from .services.audit.events import audit_system_event
from .services.user.seed import seed_admin

logger = logging.getLogger(__name__)

# Conservative security response headers applied to every response.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin",
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Connect to MongoDB, seed the admin, start scheduler, and emit lifecycle events.

    Mongo failures are logged but non-fatal so ping/health still boot for local
    development when no database is available.  Audit writes NEVER raise into callers.
    """
    settings = get_settings()
    try:
        await init_db()
        await seed_admin()
        if settings.cron_enabled:
            await start_scheduler()
        await audit_system_event(
            "system.startup",
            "Application started",
            extra={"version": __version__},
        )
    except Exception:  # noqa: BLE001 — startup must tolerate a missing DB.
        logger.exception("MongoDB init/seed failed; continuing without a database.")
    try:
        yield
    finally:
        try:
            await audit_system_event("system.shutdown", "Application stopping")
        except Exception:  # noqa: BLE001
            logger.exception("audit_system_event(system.shutdown) failed")
        try:
            await shutdown_scheduler()
        except Exception:  # noqa: BLE001
            logger.exception("shutdown_scheduler failed")
        try:
            await close_db()
        except Exception:  # noqa: BLE001
            logger.exception("close_db failed")


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
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.middleware("http")
    async def _security_headers(request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response

    app.add_middleware(AuditMiddleware, settings=settings)
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
