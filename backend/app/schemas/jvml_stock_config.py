"""JVML Stock Config / Status DTOs.

Schema contract for:
  - GET /admin/jvml-stock/config  → JvmlStockConfigPublic
  - PUT /admin/jvml-stock/config  → JvmlStockConfigUpdate (request body)
  - GET /admin/jvml-stock/status  → JvmlStockStatusPublic (embeds JvmlStockIngestionRow)

BE-17: JvmlStockConfigPublic has NO id field (singleton config, key never exposed).
BE-18: notify_emails mode="before" normalizer runs before EmailStr type coercion.
BE-22: file_name path-traversal guard rejects / \\ ..
B-10:  start_time >= end_time comparison is lexicographic HH:MM — correct for
       zero-padded 24-h strings without any time parsing.
GAP-1: model_validator(mode="after") on JvmlStockConfigUpdate is REQUIRED per plan-check.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# HH:MM regex — matches 00:00..23:59
# ---------------------------------------------------------------------------

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

# ---------------------------------------------------------------------------
# Public read DTO (no id — BE-17)
# ---------------------------------------------------------------------------


class JvmlStockConfigPublic(BaseModel):
    """Client-safe read projection of the JVML Stock config singleton.

    No ``id`` field — the config is a singleton accessed by ``key="default"``.
    Exposing the ObjectId would serve no client need and leaks internals (BE-17).
    ``notify_emails`` is ``list[str]``, not ``list[EmailStr]`` — output DTO,
    no re-validation needed or desired (mirrors RegionPublic.emails pattern).
    """

    enabled: bool
    base_path: str
    file_name: str
    start_time: str               # HH:MM — local clock
    end_time: str                 # HH:MM — local clock
    interval_hours: int
    notify_emails: list[str]      # NOT list[EmailStr] — output DTO only
    updated_at: datetime | None   # None until first explicit PUT saves the doc


# ---------------------------------------------------------------------------
# PUT body DTO (full replacement — all fields required)
# ---------------------------------------------------------------------------


class JvmlStockConfigUpdate(BaseModel):
    """PUT body for PUT /admin/jvml-stock/config.

    All fields are required (full-replacement PUT semantics).
    Validators run in pydantic v2 order:
      1. field_validator(mode="before") — normalise/validate each field first.
      2. model_validator(mode="after")  — cross-field check after all fields valid.
    """

    enabled: bool
    base_path: str = Field(max_length=500)
    file_name: str = Field(max_length=200)
    start_time: str
    end_time: str
    interval_hours: int = Field(ge=1, le=24)
    notify_emails: list[EmailStr] = Field(default_factory=list)

    # ------------------------------------------------------------------
    # Field validators (mode="before" so pydantic sees normalised values)
    # ------------------------------------------------------------------

    @field_validator("base_path", mode="before")
    @classmethod
    def strip_base_path(cls, v: Any) -> str:
        """Strip leading/trailing whitespace from base_path."""
        return str(v).strip() if v else ""

    @field_validator("file_name", mode="before")
    @classmethod
    def validate_file_name(cls, v: Any) -> str:
        """Strip and reject path-traversal characters (BE-22).

        Rejects any value containing ``/``, ``\\``, or ``..`` to prevent
        attackers from escaping the configured base directory.
        """
        v = str(v).strip() if v else ""
        if any(c in v for c in ("/", "\\", "..")):
            raise ValueError("file_name must not contain / \\ or ..")
        return v

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def validate_hhmm(cls, v: Any) -> str:
        """Enforce HH:MM format, 00:00–23:59."""
        if not isinstance(v, str) or not _HHMM_RE.match(v):
            raise ValueError("must be HH:MM in 24-hour format (00:00–23:59)")
        return v

    @field_validator("notify_emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: Any) -> list[str]:
        """Lowercase, strip, deduplicate (preserving first-seen order), cap at 100.

        Runs in ``mode="before"`` so the normalised strings feed pydantic's
        ``EmailStr`` type check, not the raw input (BE-18 / mirrors region.py).
        """
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalised = str(item).lower().strip()
            if normalised not in seen_set:
                seen_set.add(normalised)
                seen.append(normalised)
        if len(seen) > 100:
            raise ValueError("notify_emails must not exceed 100 addresses")
        return seen

    # ------------------------------------------------------------------
    # Cross-field model validator (GAP-1 — REQUIRED)
    # ------------------------------------------------------------------

    @model_validator(mode="after")
    def check_start_before_end(self) -> "JvmlStockConfigUpdate":
        """Assert start_time is strictly before end_time (B-10).

        HH:MM 24-h zero-padded strings sort correctly by lexicographic comparison
        because the format is fixed-width.  ``"08:00" < "20:00"`` is True in
        Python.  No time parsing required.
        """
        if self.start_time >= self.end_time:
            raise ValueError(
                f"start_time ({self.start_time!r}) must be strictly before "
                f"end_time ({self.end_time!r})"
            )
        return self


# ---------------------------------------------------------------------------
# Ingestion row — nested inside JvmlStockStatusPublic.recent
# ---------------------------------------------------------------------------


class JvmlStockIngestionRow(BaseModel):
    """One entry in the recent-ingestions list returned by the status endpoint."""

    report_date: str
    status: str
    row_count: int
    found_at: datetime | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Status DTO
# ---------------------------------------------------------------------------


class JvmlStockStatusPublic(BaseModel):
    """Response shape for GET /admin/jvml-stock/status.

    Combines the current config.enabled flag with a summary of the latest
    ingestion attempt and a short recent-history list.
    """

    enabled: bool
    last_report_date: str | None
    last_status: str | None
    last_row_count: int | None
    last_found_at: datetime | None
    last_alerted_at: datetime | None
    last_run_at: datetime | None = None   # when the poll last executed (every tick)
    last_error: str | None
    recent: list[JvmlStockIngestionRow]
