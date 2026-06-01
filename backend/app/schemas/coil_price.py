"""Coil price request/response DTOs.

All list/sort/filter field names must stay in sync with
``utils/coil_price/query.py`` and the ``CoilPrice`` model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .common import PageQuery

# ---------------------------------------------------------------------------
# Sort key whitelist (Literal → unknown values rejected at parse time)
# ---------------------------------------------------------------------------

CoilPriceSortBy = Literal["quantity", "price", "active", "created_at", "updated_at"]


# ---------------------------------------------------------------------------
# Query DTOs
# ---------------------------------------------------------------------------


class CoilPriceListQuery(PageQuery):
    """Query params for ``GET /admin/coil-prices``.

    Extends ``PageQuery`` (page, limit, sortOrder).  Sort keys are a Pydantic
    ``Literal`` whitelist so unknown values are rejected at parse time
    (backend-api-standards).
    """

    sortBy: CoilPriceSortBy = "quantity"
    # sortOrder, page, limit, skip inherited from PageQuery.
    # None = no filter applied; FastAPI coerces ?active=true/false to bool.
    active: bool | None = None


# ---------------------------------------------------------------------------
# Mutation DTOs
# ---------------------------------------------------------------------------


class CoilPriceCreate(BaseModel):
    """Body for ``POST /admin/coil-prices``."""

    quantity: float = Field(gt=0)
    price: float = Field(ge=0)
    active: bool = True


class CoilPriceUpdate(BaseModel):
    """Body for ``PATCH /admin/coil-prices/{coil_price_id}``.

    All fields are optional so partial updates are valid.
    """

    quantity: float | None = Field(default=None, gt=0)
    price: float | None = Field(default=None, ge=0)
    active: bool | None = None


# ---------------------------------------------------------------------------
# Response DTOs
# ---------------------------------------------------------------------------


class CoilPricePublic(BaseModel):
    """Client-safe projection of a CoilPrice document.

    ``id`` is the MongoDB ObjectId as a plain string so the frontend never
    touches ObjectId logic (``api-contract-standards``, ``owasp-security``).
    """

    id: str
    quantity: float
    price: float
    active: bool
    created_at: datetime
    updated_at: datetime
