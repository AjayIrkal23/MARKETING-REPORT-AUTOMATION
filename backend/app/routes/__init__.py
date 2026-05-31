"""Route registry: aggregate every domain router into one ``api_router``."""

from __future__ import annotations

from fastapi import APIRouter

from . import admin_user, audit_log, auth, customer_code, meta, region, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)
api_router.include_router(customer_code.router)

__all__ = ["api_router"]
