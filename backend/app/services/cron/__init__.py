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

# heartbeat MUST be imported first — it defines `audited_job`, which the other
# cron modules pull via `from ..cron import audited_job` at import time.
from .heartbeat import audited_job, heartbeat_job
from .jsw_stock import jsw_stock_poll_job
from .jvml_stock import jvml_stock_poll_job
from .credit_report import credit_report_poll_job

__all__ = [
    "heartbeat_job",
    "audited_job",
    "jsw_stock_poll_job",
    "jvml_stock_poll_job",
    "credit_report_poll_job",
]
