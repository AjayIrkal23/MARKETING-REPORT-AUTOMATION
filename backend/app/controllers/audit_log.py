"""Audit log controllers (thin: call service, wrap in envelope).

One controller per endpoint; each:
- Receives validated inputs via FastAPI Depends.
- Calls the appropriate service function (all DB/business logic lives there).
- Wraps the result in a ``success()`` envelope.

Unknown query-param rejection on the list and options endpoints mirrors the
pattern in ``controllers/admin_user.py`` (allowed keys defined via
``_ALLOWED_*`` frozensets; anything extra raises ``ValidationError`` 400).
Contract: §A11 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.audit_log import (
    AuditFacets,
    AuditLogDetail,
    AuditLogListQuery,
    AuditLogPublic,
    AuditOptionsQuery,
    AsyncOption,
)
from ..schemas.auth import AuthUser
from ..services.audit_log.get import get_audit_log
from ..services.audit_log.list import list_audit_logs
from ..services.audit_log.options import get_facets, search_audit_options

# Whitelists for unknown-key rejection (backend-api-standards).
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder",
    "q", "category", "outcome", "action", "method",
    "actor", "status", "source", "dateFrom", "dateTo",
})

_ALLOWED_OPTION_KEYS = frozenset({"q", "limit"})


async def list_audit_logs_controller(
    request: Request,
    query: AuditLogListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[AuditLogPublic]]:
    """``GET /admin/audit-logs`` — paginated, sorted, filtered audit log list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_audit_logs(query)
    return success(items, meta=meta)


async def get_options_controller(
    request: Request,
    query: AuditOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[AsyncOption]]:
    """``GET /admin/audit-logs/options`` — async combobox options (≤200)."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_audit_options(query)
    return success(options)


async def get_facets_controller(
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AuditFacets]:
    """``GET /admin/audit-logs/facets`` — filter facet enums for the toolbar."""
    return success(await get_facets())


async def get_audit_log_controller(
    log_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[AuditLogDetail]:
    """``GET /admin/audit-logs/{log_id}`` — fetch a single audit log by ObjectId."""
    return success(await get_audit_log(log_id))
