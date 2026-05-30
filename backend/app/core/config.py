"""Application settings: MongoDB connection + seed-admin credentials.

Values are read from environment variables (and a local ``.env`` via
python-dotenv), falling back to localhost-friendly defaults. Real secrets must
come from the environment, never the source tree.
"""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    """Runtime configuration, resolved once and cached."""

    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "marketing_report")
    seed_admin_email: str = os.getenv("SEED_ADMIN_EMAIL", "ajayirkal@docketrun.com")
    seed_admin_password: str = os.getenv("SEED_ADMIN_PASSWORD", "loloklol")

    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the cached singleton settings instance."""
    return Settings()
