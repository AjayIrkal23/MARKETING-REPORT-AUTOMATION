"""Audit-logging service package.

Public surface
--------------
``record_audit``        — await in contexts where the write should complete
                          before continuing (e.g. end-of-request drain).
``spawn_audit``         — fire-and-forget; schedules a background task so the
                          HTTP response is not blocked.
``audit_system_event``  — thin wrapper for ``category="system"`` events.
``audit_cron_event``    — thin wrapper for ``category="cron"`` events.
``audit_security_event``— thin wrapper for ``category="security"`` events.
``audit_auth_event``    — thin wrapper for ``category="auth"`` events.

Import order follows project convention (record first, then events).
``events`` is authored by a parallel agent in the same batch; the import is
safe at runtime because both modules are in this package and Python resolves
sibling-package imports lazily.

Contract: SPEC A3/A4 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

from .record import record_audit, spawn_audit
from .events import (
    audit_auth_event,
    audit_cron_event,
    audit_security_event,
    audit_system_event,
    audit_user_event,
)

__all__ = [
    "record_audit",
    "spawn_audit",
    "audit_system_event",
    "audit_cron_event",
    "audit_security_event",
    "audit_auth_event",
    "audit_user_event",
]
