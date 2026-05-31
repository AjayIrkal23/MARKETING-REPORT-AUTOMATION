"""Semantic audit event helpers for non-HTTP code paths.

Thin awaitable wrappers over :func:`record_audit` for system startup/shutdown,
cron jobs, security signals, and auth events.  All functions NEVER raise —
audit failures are swallowed inside ``record_audit`` and logged at ERROR level.

Usage example::

    from app.services.audit.events import audit_system_event

    await audit_system_event("system.startup", "Application started",
                             extra={"version": __version__})
"""

from __future__ import annotations

from typing import Any

from .record import record_audit


async def audit_system_event(
    action: str,
    summary: str,
    outcome: str = "success",
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a lifecycle event (startup, shutdown, migration, etc.).

    Args:
        action:  Dot-namespaced event identifier, e.g. ``"system.startup"``.
        summary: Human-readable one-line description.
        outcome: One of ``"success"``, ``"failure"``, ``"error"``; defaults to
                 ``"success"``.
        extra:   Arbitrary key/value context attached to :attr:`AuditLog.extra`.
    """
    await record_audit(
        category="system",
        action=action,
        summary=summary,
        outcome=outcome,
        source="system",
        extra=extra,
    )


async def audit_cron_event(
    action: str,
    summary: str,
    outcome: str = "success",
    duration_ms: float | None = None,
    error: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record the completion (or failure) of a scheduled cron job.

    Args:
        action:      Dot-namespaced job identifier, e.g. ``"cron.heartbeat"``.
        summary:     Human-readable description of what happened.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to
                     ``"success"``.
        duration_ms: Wall-clock run time of the job in milliseconds.
        error:       Structured error dict ``{"code", "message"}`` on failure.
        extra:       Arbitrary extra context.
    """
    await record_audit(
        category="cron",
        action=action,
        summary=summary,
        outcome=outcome,
        source="cron",
        duration_ms=duration_ms,
        error=error,
        extra=extra,
    )


async def audit_security_event(
    action: str,
    summary: str,
    outcome: str = "failure",
    actor_email: str | None = None,
    ip: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a security-relevant event (brute-force, suspicious access, etc.).

    Outcome defaults to ``"failure"`` because most security events represent
    a blocked/rejected attempt.

    Args:
        action:      Dot-namespaced identifier, e.g. ``"security.brute_force"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to
                     ``"failure"``.
        actor_email: Resolved actor email when known; ``None`` for anonymous.
        ip:          Client IP address.
        extra:       Arbitrary extra context.
    """
    await record_audit(
        category="security",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        ip=ip,
        extra=extra,
    )


async def audit_auth_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    ip: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record an authentication event (login, logout, OTP verification, etc.).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"auth.login"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to
                     ``"success"``.
        actor_email: Resolved actor email when known; ``None`` for anonymous.
        ip:          Client IP address.
        extra:       Arbitrary extra context.
    """
    await record_audit(
        category="auth",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        ip=ip,
        extra=extra,
    )


async def audit_region_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a region-management mutation event (created, updated, deleted).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"region.created"``.
        summary:     Human-readable description, e.g. ``"Created region 'West'"``.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.
        extra:       Arbitrary extra context (region_id, changed fields, etc.).
    """
    await record_audit(
        category="regions",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )


async def audit_customer_code_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a customer-code management mutation event (created, updated, deleted, imported).

    Args:
        action:      Dot-namespaced identifier, e.g. ``"customer_code.created"``.
        summary:     Human-readable description.
        outcome:     ``"success"`` | ``"failure"`` | ``"error"``; defaults to ``"success"``.
        actor_email: Admin actor email threaded from ``admin.emailid``; ``None`` if unavailable.
        extra:       Arbitrary extra context (code_id, region_id, changed fields, row count).
    """
    await record_audit(
        category="customer_codes",  # NOT "regions", NOT "customer_code" singular
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
