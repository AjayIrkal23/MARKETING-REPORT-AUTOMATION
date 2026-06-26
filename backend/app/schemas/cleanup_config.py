"""Cleanup Config DTOs.

Schema contract for:
  - GET  /admin/cleanup/config  → CleanupConfigPublic
  - PUT  /admin/cleanup/config  → CleanupConfigUpdate (request body)
  - POST /admin/cleanup/run-now → CleanupConfigPublic (with refreshed last-run)

No ``id`` field on the public DTO — the config is a singleton accessed by
``key="default"`` (mirrors CreditReportConfigPublic, BE-17).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CleanupConfigPublic(BaseModel):
    """Client-safe read projection of the cleanup config singleton."""

    enabled: bool
    retention_days: int
    run_hour: int
    last_run_at: datetime | None      # None until the job has run at least once
    last_deleted_count: int
    updated_at: datetime | None       # None until first explicit PUT saves the doc


class CleanupConfigUpdate(BaseModel):
    """PUT body for PUT /admin/cleanup/config (full-replacement semantics)."""

    enabled: bool
    # Keep at least one day; cap at a year so a fat-finger can't wipe everything
    # or grow the retention window without bound.
    retention_days: int = Field(ge=1, le=365)
    run_hour: int = Field(ge=0, le=23)
