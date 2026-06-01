"""JvmlStockConfig singleton document (MongoDB collection ``jvml_stock_configs``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a Field default factory)."""
    return datetime.now(timezone.utc)


class JvmlStockConfig(Document):
    """Singleton scheduler config; always fetched/upserted by key="default"."""

    key:            Annotated[str, Indexed(unique=True)] = "default"
    enabled:        bool = False
    base_path:      str = ""
    file_name:      str = ""
    start_time:     str = "08:00"
    end_time:       str = "20:00"
    interval_hours: int = 1
    notify_emails:  list[str] = Field(default_factory=list)
    created_at:     datetime = Field(default_factory=_now_utc)
    updated_at:     datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "jvml_stock_configs"
