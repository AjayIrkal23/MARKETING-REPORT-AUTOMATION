"""Coil-price management routes.

Router prefix: ``/admin/coil-prices``.
All routes are gated by ``get_current_admin`` at the router level — every
endpoint in this module requires an active admin session.  Backs the admin
"Coil Config" page's "Per Coil Price" section.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import coil_price as ctrl
from ..core.auth_deps import get_current_admin
from ..core.responses import SuccessEnvelope
from ..schemas.coil_price import CoilPricePublic

router = APIRouter(
    prefix="/admin/coil-prices",
    tags=["admin-coil-prices"],
    dependencies=[Depends(get_current_admin)],
)

# --- Collection-level routes ---

router.add_api_route(
    "",
    ctrl.list_coil_prices_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[list[CoilPricePublic]],
    summary="List coil prices (paginated)",
)

router.add_api_route(
    "",
    ctrl.create_coil_price_controller,
    methods=["POST"],
    response_model=SuccessEnvelope[CoilPricePublic],
    status_code=201,
    summary="Create a coil price",
)

# --- Item-level routes ---

router.add_api_route(
    "/{coil_price_id}",
    ctrl.get_coil_price_controller,
    methods=["GET"],
    response_model=SuccessEnvelope[CoilPricePublic],
    summary="Get a coil price by id",
)

router.add_api_route(
    "/{coil_price_id}",
    ctrl.update_coil_price_controller,
    methods=["PATCH"],
    response_model=SuccessEnvelope[CoilPricePublic],
    summary="Update a coil price",
)

router.add_api_route(
    "/{coil_price_id}",
    ctrl.delete_coil_price_controller,
    methods=["DELETE"],
    response_model=SuccessEnvelope[None],
    summary="Delete a coil price",
)
