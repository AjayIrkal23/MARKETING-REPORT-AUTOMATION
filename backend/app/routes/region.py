"""Region-management routes.

Router prefix: ``/admin/regions``.
All routes are gated by ``get_current_admin`` at the router level — every
endpoint in this module requires an active admin session.

IMPORTANT: ``/options`` is registered BEFORE ``/{region_id}`` so FastAPI does
not absorb the literal string "options" as an id path parameter.  Route
registration order is significant in Starlette/FastAPI.
Contract: .planning/regions/SPEC.md §1.6.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import region as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.region import RegionOption, RegionPublic

router = APIRouter(
    prefix="/admin/regions",
    tags=["admin-regions"],
    dependencies=[Depends(get_current_admin)],
)

# --- Collection-level routes ---

router.add_api_route(
    "",
    ctrl.list_regions_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[RegionPublic]],
    summary="List regions (paginated)",
)

# /options MUST be registered before /{region_id} — FastAPI routes are matched
# in registration order and literal-string segments must precede variable ones
# (same guard as audit_log.py for /options before /{log_id}).

router.add_api_route(
    "/options",
    ctrl.region_options_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[RegionOption]],
    summary="Async combobox options",
)

router.add_api_route(
    "",
    ctrl.create_region_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[RegionPublic],
    status_code=201,
    summary="Create a region",
)

# --- Item-level routes ---

router.add_api_route(
    "/{region_id}",
    ctrl.get_region_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[RegionPublic],
    summary="Get a region by id",
)

router.add_api_route(
    "/{region_id}",
    ctrl.update_region_controller,
    methods=["PATCH"],
    response_model=SuccessEnvelope[RegionPublic],
    summary="Update a region",
)

router.add_api_route(
    "/{region_id}",
    ctrl.delete_region_controller,
    methods=["DELETE"],
    response_model=SuccessEnvelope[None],
    summary="Delete a region",
)
