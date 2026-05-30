"""Shared request/response schema pieces (pagination input)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SortOrder = Literal["asc", "desc"]


class PageQuery(BaseModel):
    """Base list query: backend-driven pagination + sorting.

    Domain query schemas extend this and pin ``sortBy`` to a whitelist via a
    ``Literal`` so unknown sort keys are rejected (``backend-api-standards``).
    """

    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sortOrder: SortOrder = "desc"

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit
