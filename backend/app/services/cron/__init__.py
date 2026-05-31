"""Scheduled cron jobs package.

Public surface
--------------
``heartbeat_job``  — async job: counts AuditLog docs, emits a cron audit entry.
``audited_job``    — decorator factory: auto-audits any async cron job.

Both are imported here so ``core.scheduler`` (and any future scheduler) can do::

    from app.services.cron import heartbeat_job, audited_job

Contract: SPEC A7 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

from .heartbeat import audited_job, heartbeat_job

__all__ = ["heartbeat_job", "audited_job"]
