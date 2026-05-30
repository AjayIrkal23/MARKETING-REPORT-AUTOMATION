"""Route registry: aggregate every domain router into one ``api_router``."""

from __future__ import annotations

from fastapi import APIRouter

from . import auth, meta, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)

__all__ = ["api_router"]
