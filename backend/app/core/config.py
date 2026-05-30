"""Application settings: MongoDB connection + seed-admin credentials.

Values are read from environment variables and a local ``.env`` (via
pydantic-settings). Real secrets MUST come from the environment — there is no
hardcoded password fallback in the source tree (OWASP A02).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, resolved once and cached.

    Field names map to env vars case-insensitively
    (``SEED_ADMIN_PASSWORD`` -> ``seed_admin_password``).
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "marketing_report"
    seed_admin_email: str = "ajayirkal@docketrun.com"
    # No default secret: must come from the environment / .env. When empty,
    # seeding is skipped (a warning is logged) rather than provisioning a
    # known password.
    seed_admin_password: str = ""

    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the cached singleton settings instance."""
    return Settings()
