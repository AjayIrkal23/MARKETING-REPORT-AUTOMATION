"""Shared response DTO for duplicate-cleanup endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class CleanupDuplicatesResponse(BaseModel):
    """Result of a same-date duplicate cleanup run."""

    deleted: int
