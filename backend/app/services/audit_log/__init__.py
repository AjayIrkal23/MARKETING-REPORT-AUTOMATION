"""Audit log read-service layer.

Public surface:
  - ``list_audit_logs`` — paginated listing (A10).
  - ``get_audit_log``   — single-document fetch by ObjectId (A10).
  - ``search_audit_options`` — async combobox suggestions (A10).
  - ``get_facets``      — filter facet enums (A10).
  - ``to_public``       — AuditLog → AuditLogPublic serialiser.
  - ``to_detail``       — AuditLog → AuditLogDetail serialiser.

Each sub-module raises typed ``AppError`` subclasses; raw exceptions never
propagate to callers (``backend-error-handling``).
"""

from __future__ import annotations

from .get import get_audit_log
from .list import list_audit_logs
from .options import get_facets, search_audit_options
from .serialize import to_detail, to_public

__all__ = [
    "list_audit_logs",
    "get_audit_log",
    "search_audit_options",
    "get_facets",
    "to_public",
    "to_detail",
]
