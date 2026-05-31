"""Customer-code management routes.

Router prefix: ``/admin/customer-codes``.
All routes are gated by ``get_current_admin`` at the router level — every
endpoint in this module requires an active admin session.

IMPORTANT: Literal-segment routes (``/options``, ``/template``, ``/import``)
are registered BEFORE ``/{code_id}`` so FastAPI does not absorb those literal
strings as an id path parameter.  Route registration order is significant in
Starlette/FastAPI — the same guard used in region.py for ``/options`` before
``/{region_id}`` and in audit_log.py for ``/options``/``/facets`` before
``/{log_id}``.

``GET /template`` returns a binary ``StreamingResponse`` — it is registered
WITHOUT a ``response_model`` to prevent FastAPI from attempting Pydantic
serialization on the raw stream (which would raise a runtime error).

Registration order (SPEC §2.7 + ADDENDUM Area 3 BLOCKER-4/5):
  1. GET  ""          → list
  2. GET  /options    → field options
  3. GET  /template   → download template  (NO response_model)
  4. POST /import     → import rows
  5. POST ""          → create (201)
  6. GET  /{code_id}  → get
  7. PATCH /{code_id} → update
  8. DELETE /{code_id}→ delete

Contract: .planning/customer-codes/SPEC.md §2.7 + ADDENDUM.md Area 3.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import customer_code as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.customer_code import (
    CustomerCodeImportResult,
    CustomerCodeOption,
    CustomerCodePublic,
)

router = APIRouter(
    prefix="/admin/customer-codes",
    tags=["admin-customer-codes"],
    dependencies=[Depends(get_current_admin)],
)

# ---------------------------------------------------------------------------
# Collection-level routes — literal segments first
# ---------------------------------------------------------------------------

router.add_api_route(
    "",
    ctrl.list_customer_codes_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[CustomerCodePublic]],
    summary="List customer codes (paginated)",
)

# /options MUST be registered before /{code_id} — FastAPI routes are matched
# in registration order; literal-string segments must precede variable ones
# (same guard as region.py ``/options`` before ``/{region_id}``).

router.add_api_route(
    "/options",
    ctrl.field_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[CustomerCodeOption]],
    summary="Async combobox field options",
)

# /template MUST be registered before /{code_id} for the same reason.
# NO response_model — this route returns a binary StreamingResponse and
# FastAPI must not attempt Pydantic serialization on it (ADDENDUM BLOCKER-4).

router.add_api_route(
    "/template",
    ctrl.download_template_controller,
    methods=["GET"],
    summary="Download customer codes import template (.xlsx)",
)

# /import MUST be registered before /{code_id} (ADDENDUM BLOCKER-5 ordering).

router.add_api_route(
    "/import",
    ctrl.import_customer_codes_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CustomerCodeImportResult],
    summary="Import customer codes from .xlsx",
)

router.add_api_route(
    "",
    ctrl.create_customer_code_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CustomerCodePublic],
    status_code=201,
    summary="Create a customer code",
)

# ---------------------------------------------------------------------------
# Item-level routes — variable segment; always after all literal routes above
# ---------------------------------------------------------------------------

router.add_api_route(
    "/{code_id}",
    ctrl.get_customer_code_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[CustomerCodePublic],
    summary="Get a customer code by id",
)

router.add_api_route(
    "/{code_id}",
    ctrl.update_customer_code_controller,
    methods=["PATCH"],
    response_model=SuccessEnvelope[CustomerCodePublic],
    summary="Update a customer code",
)

router.add_api_route(
    "/{code_id}",
    ctrl.delete_customer_code_controller,
    methods=["DELETE"],
    response_model=SuccessEnvelope[None],
    summary="Delete a customer code",
)
