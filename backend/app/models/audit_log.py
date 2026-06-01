"""AuditLog document model (MongoDB collection ``audit_logs``, via Beanie)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from beanie import Document, Indexed
from pydantic import Field


# ---------------------------------------------------------------------------
# Type aliases — shared taxonomy (SPEC A0).  Import these from here in all
# backend layers that need to reference the literal sets.
# ---------------------------------------------------------------------------

AuditCategory = Literal["http", "auth", "admin", "data", "system", "cron", "security", "users", "regions", "customer_codes", "jsw_stock", "jvml_stock", "credit_report", "coil_config", "report"]
AuditOutcome = Literal["success", "failure", "error"]
AuditSource = Literal["http", "system", "cron", "service"]


def _now_utc() -> datetime:
    """Return the current UTC datetime (used as a :func:`~pydantic.Field` default factory)."""
    return datetime.now(timezone.utc)


class AuditLog(Document):
    """A single audit log entry.

    Written automatically by ``AuditMiddleware`` for every HTTP request, and
    explicitly by ``services.audit.events`` helpers for system / cron events.
    Writes are fire-and-forget — they **must never raise into the caller**.

    ``category``, ``outcome``, and ``source`` store the string values of the
    ``AuditCategory``, ``AuditOutcome``, and ``AuditSource`` literals (declared
    above) so that Indexed fields remain plain ``str`` in MongoDB while the
    application layer still benefits from the Literal type aliases.
    """

    # ------------------------------------------------------------------
    # Core fields
    # ------------------------------------------------------------------

    timestamp: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    category: Annotated[str, Indexed()]  # AuditCategory value
    action: Annotated[str, Indexed()]    # e.g. "http.request", "system.startup"
    summary: str = ""
    outcome: Annotated[str, Indexed()] = "success"  # AuditOutcome value
    source: str = "service"                          # AuditSource value

    # ------------------------------------------------------------------
    # HTTP context (None for non-http events)
    # ------------------------------------------------------------------

    method: str | None = None
    path: Annotated[str | None, Indexed()] = None
    route: str | None = None        # matched route template, e.g. "/admin/users/{user_id}"
    status_code: Annotated[int | None, Indexed()] = None
    duration_ms: float | None = None

    # ------------------------------------------------------------------
    # Actor — resolved from the session cookie; None for anonymous / system
    # ------------------------------------------------------------------

    actor_email: Annotated[str | None, Indexed()] = None
    actor_is_admin: bool | None = None
    ip: str | None = None
    user_agent: str | None = None
    request_id: str | None = None

    # ------------------------------------------------------------------
    # Payloads — redacted and size-capped before storage
    # ------------------------------------------------------------------

    request_meta: dict[str, Any] | None = None   # {"query": ..., "headers": ..., "body": ...}
    response_meta: dict[str, Any] | None = None  # {"body": ..., "bytes": int}
    error: dict[str, Any] | None = None          # {"code", "message", "details"}
    extra: dict[str, Any] | None = None          # arbitrary semantic context

    class Settings:
        name = "audit_logs"
