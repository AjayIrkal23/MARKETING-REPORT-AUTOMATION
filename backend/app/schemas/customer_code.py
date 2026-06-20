"""Customer code request/response DTOs.

Contract source: .planning/customer-codes/SPEC.md §2.2 + ADDENDUM §Area 1.
All list/sort/filter field names must stay in sync with
``utils/customer_code/query.py`` and the ``CustomerCode`` model.

ADDENDUM corrections applied:
- AsyncOption imported exclusively from ``.admin_user`` (BLOCKER 2 & 3).
- ``region_id`` included in ``strip_and_normalize`` validator (BLOCKER 5).
- Region FK query key is ``region`` (not ``region_id``) — SPEC §2.2.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .admin_user import AsyncOption
from .common import PageQuery

# ---------------------------------------------------------------------------
# AsyncOption alias (ADDENDUM BLOCKER 2 + 3: import from .admin_user ONLY)
# ---------------------------------------------------------------------------

CustomerCodeOption = AsyncOption  # type alias — no new class defined

# ---------------------------------------------------------------------------
# Sort key whitelist (Literal → unknown values rejected at parse time)
# ---------------------------------------------------------------------------

CustomerCodeSortBy = Literal[
    "segment", "code", "customer", "destination",
    "cam", "head", "route",
    "ship_to_city", "rake", "transport_mode",
    "created_at", "updated_at",
]

# Per-field filter whitelist (used by CustomerCodeOptionsQuery)
CustomerCodeField = Literal[
    "segment", "code", "customer", "destination",
    "cam", "mob",
    "ship_to_city", "rake", "transport_mode",
]

# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class CustomerCodeListQuery(PageQuery):
    """Query params for ``GET /admin/customer-codes``.

    Extends ``PageQuery`` (page, limit, sortOrder).  Sort keys are a Pydantic
    ``Literal`` whitelist so unknown values are rejected at parse time.

    Per-field exact-match filters mirror every text field on the model.
    Region FK filter uses query key ``region`` (not ``region_id``); the
    service maps it to ``filt["region_id"]`` internally (SPEC §2.2).
    """

    sortBy: CustomerCodeSortBy = "created_at"
    # Free-text search across all fifteen text fields; length-capped for regex safety.
    q: str | None = Field(default=None, max_length=200)
    # Per-field exact-match filters (None = no filter applied).
    segment: str | None = Field(default=None, max_length=200)
    code: str | None = Field(default=None, max_length=200)
    customer: str | None = Field(default=None, max_length=200)
    destination: str | None = Field(default=None, max_length=200)
    cam: str | None = Field(default=None, max_length=200)
    mob: str | None = Field(default=None, max_length=200)
    ship_to_city: str | None = Field(default=None, max_length=200)
    rake: str | None = Field(default=None, max_length=200)
    transport_mode: str | None = Field(default=None, max_length=200)
    # Region FK filter — FE sends ?region=<id>; backend maps to region_id.
    region: str | None = Field(default=None, max_length=200)


class CustomerCodeOptionsQuery(BaseModel):
    """Query params for ``GET /admin/customer-codes/options``.

    Returns distinct field values, optionally filtered by search string.
    Hard-capped at 50 (options lists only).
    """

    field: CustomerCodeField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)


# ---------------------------------------------------------------------------
# Mutation DTOs
# ---------------------------------------------------------------------------

# Shared validator applied to both Create and Update schemas.
_STRIP_FIELDS = (
    "segment", "code", "customer", "destination", "region_id",
    "cam", "mob", "head", "route",
    "ship_to", "ship_to_customer",
    "ship_to_2", "ship_to_customer_2",
    "ship_to_city", "rake", "transport_mode",
)


class CustomerCodeCreate(BaseModel):
    """Body for ``POST /admin/customer-codes``.

    Required: segment, code, customer, destination, region_id.
    Optional: cam, mob, head, route, ship_to, ship_to_customer.

    ``strip_and_normalize`` (mode="before") strips strings, coerces non-str
    scalars, and converts empty/whitespace optionals to ``None``.
    For required fields returning ``None`` triggers ``min_length=1``.
    ADDENDUM BLOCKER 5: ``region_id`` is explicitly listed in the validator.
    """

    # Required fields
    segment: str = Field(min_length=1, max_length=200)
    code: str = Field(min_length=1, max_length=200)
    customer: str = Field(min_length=1, max_length=200)
    destination: str = Field(min_length=1, max_length=200)
    region_id: str = Field(min_length=1)
    # Optional fields
    cam: str | None = Field(default=None, max_length=200)
    mob: str | None = Field(default=None, max_length=200)
    head: str | None = Field(default=None, max_length=200)
    route: str | None = Field(default=None, max_length=200)
    ship_to: str | None = Field(default=None, max_length=200)
    ship_to_customer: str | None = Field(default=None, max_length=200)
    ship_to_2: str | None = Field(default=None, max_length=200)
    ship_to_customer_2: str | None = Field(default=None, max_length=200)
    ship_to_city: str | None = Field(default=None, max_length=200)
    rake: str | None = Field(default=None, max_length=200)
    transport_mode: str | None = Field(default=None, max_length=200)

    @field_validator(*_STRIP_FIELDS, mode="before")
    @classmethod
    def strip_and_normalize(cls, v: object) -> object:
        """Strip whitespace; coerce non-str scalars; return ``None`` for blanks."""
        if v is None:
            return None
        if not isinstance(v, str):
            v = str(v)
        stripped = v.strip()
        return stripped if stripped else None


class CustomerCodeBulkDeleteRequest(BaseModel):
    """Body for ``POST /admin/customer-codes/bulk-delete``.

    Deletes up to ``MAX_BULK_DELETE_COUNT`` customer codes by ObjectId hex.
    Invalid or unknown ids are silently ignored; the response reports how
    many documents were actually removed.
    """

    ids: list[str] = Field(min_length=1, max_length=100)


class CustomerCodeUpdate(BaseModel):
    """Body for ``PATCH /admin/customer-codes/{code_id}``.

    All fields optional; ``model_dump(exclude_unset=True)`` drives partial
    update so unset fields are never touched.  Same strip/normalize applied.
    ADDENDUM BLOCKER 5: ``region_id`` is explicitly listed in the validator.
    """

    segment: str | None = Field(default=None, min_length=1, max_length=200)
    code: str | None = Field(default=None, min_length=1, max_length=200)
    customer: str | None = Field(default=None, min_length=1, max_length=200)
    destination: str | None = Field(default=None, min_length=1, max_length=200)
    region_id: str | None = Field(default=None, min_length=1)
    cam: str | None = Field(default=None, max_length=200)
    mob: str | None = Field(default=None, max_length=200)
    head: str | None = Field(default=None, max_length=200)
    route: str | None = Field(default=None, max_length=200)
    ship_to: str | None = Field(default=None, max_length=200)
    ship_to_customer: str | None = Field(default=None, max_length=200)
    ship_to_2: str | None = Field(default=None, max_length=200)
    ship_to_customer_2: str | None = Field(default=None, max_length=200)
    ship_to_city: str | None = Field(default=None, max_length=200)
    rake: str | None = Field(default=None, max_length=200)
    transport_mode: str | None = Field(default=None, max_length=200)

    @field_validator(*_STRIP_FIELDS, mode="before")
    @classmethod
    def strip_and_normalize(cls, v: object) -> object:
        """Strip whitespace; coerce non-str scalars; return ``None`` for blanks."""
        if v is None:
            return None
        if not isinstance(v, str):
            v = str(v)
        stripped = v.strip()
        return stripped if stripped else None


# ---------------------------------------------------------------------------
# Response DTOs
# ---------------------------------------------------------------------------


class CustomerCodePublic(BaseModel):
    """Client-safe projection of a CustomerCode document.

    ``id`` is the MongoDB ObjectId as a plain string so the frontend never
    touches ObjectId logic.  ``region_name`` is resolved by the service layer
    (batch or single lookup) and may be ``None`` if the linked region was
    subsequently deleted.
    """

    id: str
    segment: str
    code: str
    customer: str
    destination: str
    cam: str | None
    mob: str | None
    head: str | None
    route: str | None
    ship_to: str | None
    ship_to_customer: str | None
    ship_to_2: str | None
    ship_to_customer_2: str | None
    ship_to_city: str | None
    rake: str | None
    transport_mode: str | None
    region_id: str
    region_name: str | None  # resolved by service; None if region deleted
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Import result DTOs
# ---------------------------------------------------------------------------


class CustomerCodeImportError(BaseModel):
    """A single row-level error from the Excel import pipeline.

    ``row`` is the 1-based Excel row number (header = row 1, first data = row 2).
    ``row=0`` is used for header-level errors (missing required columns) or
    the MAX_IMPORT_ROWS guard.
    """

    row: int
    message: str


class CustomerCodeImportResult(BaseModel):
    """Summary envelope returned by ``POST /admin/customer-codes/import``.

    Invariant: ``total_rows == inserted + updated + skipped + len(errors)``
    where ``skipped`` counts fully-empty rows silently bypassed.
    """

    total_rows: int
    inserted: int
    updated: int
    skipped: int
    region_id: str
    region_name: str | None
    errors: list[CustomerCodeImportError]
