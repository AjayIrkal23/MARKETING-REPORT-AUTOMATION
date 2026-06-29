"""CreditReportIngestion document (MongoDB collection ``credit_report_ingestions``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import BaseModel, Field


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a Field default factory)."""
    return datetime.now(timezone.utc)


class CreditReportZoneRun(BaseModel):
    """Per-region ingestion status embedded in a daily ingestion record."""

    region_id: str
    name: str
    status: str = "pending"   # pending | ingested | missing | error
    row_count: int = 0
    found_at: datetime | None = None
    file_path: str | None = None
    error: str | None = None


class CreditReportIngestion(Document):
    """One record per calendar date; tracks file discovery and ingestion lifecycle."""

    report_date: Annotated[str, Indexed(unique=True)]   # "dd-mm-yyyy"; always set at create time
    status:      str = "pending"   # pending | ingested | partial | missing | alerted | error
    row_count:   int = 0
    dup_party_count: int = 0
    file_path:   str | None = None
    found_at:    datetime | None = None
    alerted_at:  datetime | None = None
    last_run_at: datetime | None = None   # stamped on EVERY poll tick (local clock, BE-14)
    error:       str | None = None
    zones:       list[CreditReportZoneRun] = Field(default_factory=list)
    created_at:  datetime = Field(default_factory=_now_utc)
    updated_at:  datetime = Field(default_factory=_now_utc)

    class Settings:
        name = "credit_report_ingestions"
