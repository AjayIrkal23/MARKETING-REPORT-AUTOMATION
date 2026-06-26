"""CleanupConfig singleton document (MongoDB collection ``cleanup_configs``, via Beanie).

Drives the daily job that deletes stale ``<base_path>/<dd-mm-yyyy>`` ingestion
folders (files only — DB ingestion records are never touched). The folders it
cleans are the distinct ``base_path``s of the JSW / JVML / Credit Report configs;
this singleton only carries the *policy* (retention window + run hour).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a Field default factory)."""
    return datetime.now(timezone.utc)


class CleanupConfig(Document):
    """Singleton cleanup policy; always fetched/upserted by key="default"."""

    key:                Annotated[str, Indexed(unique=True)] = "default"
    enabled:            bool = False
    retention_days:     int = 5      # delete date folders strictly older than this
    run_hour:           int = 3      # 0–23, LOCAL tz hour the daily job fires
    last_run_at:        datetime | None = None
    last_deleted_count: int = 0
    created_at:         datetime = Field(default_factory=_now_utc)
    updated_at:         datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "cleanup_configs"
