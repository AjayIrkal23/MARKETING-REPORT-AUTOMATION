"""Audit log routes.

Router prefix: ``/admin/audit-logs``.
All routes are gated by ``get_current_admin`` at the router level — every
endpoint in this module requires an active admin session.

IMPORTANT: ``/options`` and ``/facets`` are registered BEFORE ``/{log_id}`` so
FastAPI does not absorb the literal strings "options" or "facets" as an id
path parameter.  Route registration order is significant in Starlette/FastAPI.
Contract: §A12 of .planning/audit/SPEC.md.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import audit_log as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.audit_log import (
    AuditFacets,
    AuditLogDetail,
    AuditLogPublic,
    AsyncOption,
)

router = APIRouter(
    prefix="/admin/audit-logs",
    tags=["admin-audit-logs"],
    dependencies=[Depends(get_current_admin)],
)

# --- Collection-level routes ---

router.add_api_route(
    "",
    ctrl.list_audit_logs_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AuditLogPublic]],
    summary="List audit logs (paginated)",
)

# /options and /facets MUST be registered before /{log_id} — FastAPI routes
# are matched in registration order and literal-string segments must precede
# variable ones (same guard as admin_user.py for /options before /{user_id}).

router.add_api_route(
    "/options",
    ctrl.get_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[AsyncOption]],
    summary="Async combobox options",
)

router.add_api_route(
    "/facets",
    ctrl.get_facets_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[AuditFacets],
    summary="Filter facet enums",
)

# --- Item-level routes ---

router.add_api_route(
    "/{log_id}",
    ctrl.get_audit_log_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[AuditLogDetail],
    summary="Get an audit log by id",
)
