"""Standard API response envelopes (``api-contract-standards``).

Success: ``{success, data, message, meta}``.
Error:   ``{success: false, error: {code, message, details}}``.

Controllers return :class:`SuccessEnvelope` instances; the exception handlers
build :class:`ErrorEnvelope` responses. ``meta`` carries pagination on list
endpoints.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Stable list metadata, identical across domains."""

    page: int
    limit: int
    total: int
    totalPages: int
    sortBy: str
    sortOrder: str


class SuccessEnvelope(BaseModel, Generic[T]):
    """Wrapper for every successful JSON response."""

    success: bool = True
    data: T
    message: str = ""
    meta: dict[str, Any] | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    success: bool = False
    error: ErrorBody


def success(data: T, message: str = "", meta: dict[str, Any] | None = None) -> SuccessEnvelope[T]:
    """Build a success envelope."""
    return SuccessEnvelope[T](data=data, message=message, meta=meta)
