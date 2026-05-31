"""Audit log request/response DTOs.

Contract: SPEC A8 of .planning/audit/SPEC.md.
All list/sort/filter field names must stay in sync with
``utils/audit_log/query.py`` and the ``AuditLog`` model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from .common import PageQuery

# ---------------------------------------------------------------------------
# Shared taxonomy (identical literal values live in models/audit_log.py too;
# keep both in sync — the model uses plain ``str`` fields for Beanie compat).
# ---------------------------------------------------------------------------

AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
AuditOutcome = Literal["success", "failure", "error"]
AuditSource = Literal["http", "system", "cron", "service"]

AuditSortBy = Literal[
    "timestamp",
    "category",
    "action",
    "outcome",
    "status_code",
    "actor_email",
    "duration_ms",
    "path",
    "method",
]


# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class AuditLogListQuery(PageQuery):
    """Query params for ``GET /admin/audit-logs``.

    Extends ``PageQuery`` (page, limit, sortOrder).  Sort keys are a Pydantic
    ``Literal`` whitelist so unknown values are rejected at parse time
    (backend-api-standards).
    """

    sortBy: AuditSortBy = "timestamp"
    # sortOrder inherited from PageQuery (default "desc")
    # Free-text search over path / summary / action / actor_email.
    q: str | None = Field(default=None, max_length=200)
    # Taxonomy filters — None means "no filter applied".
    category: AuditCategory | None = None
    outcome: AuditOutcome | None = None
    # Exact action identifier filter (e.g. "http.request"); None = all actions.
    action: str | None = Field(default=None, max_length=120)
    # HTTP method (e.g. "GET", "POST") — uppercased by the query builder.
    method: str | None = Field(default=None, max_length=10)
    # Partial actor email match.
    actor: str | None = Field(default=None, max_length=200)
    # Exact HTTP status code filter.
    status: int | None = Field(default=None, ge=100, le=599)
    source: AuditSource | None = None
    # Inclusive timestamp range.
    dateFrom: datetime | None = None
    dateTo: datetime | None = None


class AuditOptionsQuery(BaseModel):
    """Query params for ``GET /admin/audit-logs/options``.

    Drives the async combobox; hard-capped at 200 per the FE contract (SPEC §B3).
    """

    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=50, ge=1, le=200)


# ---------------------------------------------------------------------------
# Response DTOs
# ---------------------------------------------------------------------------


class AuditLogPublic(BaseModel):
    """Client-safe list-row projection of an AuditLog document.

    Omits heavy payload fields (request_meta, response_meta, error, extra)
    so list responses stay lean.  ``id`` is the MongoDB ObjectId as a plain
    string so the frontend never touches ObjectId logic.
    """

    id: str
    timestamp: datetime
    category: str
    action: str
    summary: str
    outcome: str
    source: str
    method: str | None = None
    path: str | None = None
    route: str | None = None
    status_code: int | None = None
    duration_ms: float | None = None
    actor_email: str | None = None
    ip: str | None = None


class AuditLogDetail(AuditLogPublic):
    """Full audit entry returned by ``GET /admin/audit-logs/{log_id}``.

    Extends ``AuditLogPublic`` with actor metadata and captured payloads.
    Payload dicts have already been redacted by the middleware (SPEC A2).
    """

    actor_is_admin: bool | None = None
    user_agent: str | None = None
    request_id: str | None = None
    request_meta: dict[str, Any] | None = None
    response_meta: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    extra: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Async options DTO (backend-driven select / combobox — SPEC §A10 / §B3)
# ---------------------------------------------------------------------------


class AsyncOption(BaseModel):
    """Single option entry for the backend-driven async combobox.

    Identical shape to ``schemas.admin_user.AsyncOption`` so FE can reuse the
    same ``AsyncOption`` type (``types/admin/options.ts``).

    ``sublabel`` carries secondary display text (e.g. "actor", "route").
    """

    value: str
    label: str
    sublabel: str | None = None


# ---------------------------------------------------------------------------
# Facets DTO (enumerated filter values for the toolbar — SPEC §A10)
# ---------------------------------------------------------------------------


class AuditFacets(BaseModel):
    """Static + live filter facet enums returned by ``GET /admin/audit-logs/facets``.

    ``categories``, ``outcomes``, and ``sources`` are static (from the taxonomy
    Literals above); ``methods``, ``statuses`` (distinct status_code, ascending),
    and ``actions`` (distinct action, sorted) are all derived at query time from
    distinct values in the collection so they reflect only observed data.
    """

    categories: list[str]
    outcomes: list[str]
    sources: list[str]
    methods: list[str]
    statuses: list[int]
    actions: list[str]
