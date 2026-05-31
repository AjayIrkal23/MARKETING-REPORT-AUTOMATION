"""Region request/response DTOs.

Contract source: .planning/regions/SPEC.md §1.2 + ADDENDUM §schemas/region.py.
All list/sort/filter field names must stay in sync with
``utils/region/query.py`` and the ``Region`` model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from .common import PageQuery

# ---------------------------------------------------------------------------
# Sort key whitelist (Literal → unknown values rejected at parse time)
# ---------------------------------------------------------------------------

RegionSortBy = Literal["name", "active", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class RegionListQuery(PageQuery):
    """Query params for ``GET /admin/regions``.

    Extends ``PageQuery`` (page, limit, sortOrder).  Sort keys are a Pydantic
    ``Literal`` whitelist so unknown values are rejected at parse time
    (backend-api-standards).
    """

    sortBy: RegionSortBy = "created_at"
    # sortOrder, page, limit, skip inherited from PageQuery
    # Free-text search over name + emails; length-capped to bound the regex.
    q: str | None = Field(default=None, max_length=200)
    # None = no filter applied; FastAPI coerces ?active=true/false to bool.
    active: bool | None = None


class RegionOptionsQuery(BaseModel):
    """Query params for ``GET /admin/regions/options``.

    Hard-capped at 50 (stricter than user/audit 200 — options are name-only).
    """

    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)


# ---------------------------------------------------------------------------
# Mutation DTOs
# ---------------------------------------------------------------------------


class RegionCreate(BaseModel):
    """Body for ``POST /admin/regions``."""

    name: str = Field(min_length=1, max_length=120)
    emails: list[EmailStr] = Field(default_factory=list)
    active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: list | None) -> list:
        """Lowercase, strip, deduplicate (preserving order), cap at 100.

        Runs in ``mode="before"`` so normalized strings feed pydantic's
        EmailStr check rather than the raw input.
        """
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalized = str(item).lower().strip()
            if normalized not in seen_set:
                seen_set.add(normalized)
                seen.append(normalized)
        if len(seen) > 100:
            raise ValueError("emails list exceeds maximum of 100 recipients")
        return seen


class RegionUpdate(BaseModel):
    """Body for ``PATCH /admin/regions/{region_id}``.

    All fields are optional so partial updates are valid.  Same normalization
    validators as ``RegionCreate`` are applied when the field is provided.
    """

    name: str | None = Field(default=None, min_length=1, max_length=120)
    emails: list[EmailStr] | None = None
    active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("emails", mode="before")
    @classmethod
    def normalize_emails(cls, v: list | None) -> list | None:
        """Lowercase, strip, deduplicate (preserving order), cap at 100.

        Returns ``None`` (unset sentinel) when ``v`` is ``None`` so
        ``model_dump(exclude_unset=True)`` correctly omits the field.
        """
        if v is None:
            return None
        if not v:
            return []
        seen: list[str] = []
        seen_set: set[str] = set()
        for item in v:
            normalized = str(item).lower().strip()
            if normalized not in seen_set:
                seen_set.add(normalized)
                seen.append(normalized)
        if len(seen) > 100:
            raise ValueError("emails list exceeds maximum of 100 recipients")
        return seen


# ---------------------------------------------------------------------------
# Response DTOs
# ---------------------------------------------------------------------------


class RegionPublic(BaseModel):
    """Client-safe projection of a Region document.

    ``id`` is the MongoDB ObjectId as a plain string so the frontend never
    touches ObjectId logic.  ``emails`` is ``list[str]`` (NOT ``list[EmailStr]``)
    — this is an output DTO; no re-validation is needed or desired.
    """

    id: str
    name: str
    emails: list[str]       # NOT list[EmailStr] — output DTO, no re-validation
    active: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Async options DTO (backend-driven select / combobox)
# ---------------------------------------------------------------------------


class RegionOption(BaseModel):
    """Single option entry for the backend-driven async combobox.

    ``value``    — str(region.id)
    ``label``    — region.name
    ``sublabel`` — e.g. "3 recipient(s) · Active"
    """

    value: str
    label: str
    sublabel: str | None = None
