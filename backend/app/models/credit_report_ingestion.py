"""CreditReportIngestion document (MongoDB collection ``credit_report_ingestions``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a Field default factory)."""
    return datetime.now(timezone.utc)


class CreditReportIngestion(Document):
    """One record per calendar date; tracks file discovery and ingestion lifecycle."""

    report_date: Annotated[str, Indexed(unique=True)]   # "dd-mm-yyyy"; always set at create time
    status:      str = "pending"   # pending | ingested | missing | alerted | error (plain str per BE-5)
    row_count:   int = 0
    file_path:   str | None = None
    found_at:    datetime | None = None
    alerted_at:  datetime | None = None
    error:       str | None = None
    created_at:  datetime = Field(default_factory=_now_utc)
    updated_at:  datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "credit_report_ingestions"
