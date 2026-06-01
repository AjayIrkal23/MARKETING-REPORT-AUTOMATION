"""Coil-price-domain controllers (thin: call service, wrap in envelope).

One controller per endpoint; each receives validated inputs via FastAPI
``Depends``, calls the appropriate service function (all DB/business logic lives
there), and wraps the result in a ``success()`` envelope.  Unknown query-param
rejection on the list endpoint mirrors ``controllers/region.py``.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.coil_price import (
    CoilPriceCreate,
    CoilPriceListQuery,
    CoilPricePublic,
    CoilPriceUpdate,
)
from ..services.coil_price.create import create_coil_price
from ..services.coil_price.delete import delete_coil_price
from ..services.coil_price.get import get_coil_price
from ..services.coil_price.list import list_coil_prices
from ..services.coil_price.update import update_coil_price

# Whitelist for unknown-key rejection (backend-api-standards).
_ALLOWED_LIST_KEYS = frozenset({"page", "limit", "sortBy", "sortOrder", "active"})


async def list_coil_prices_controller(
    request: Request,
    query: CoilPriceListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[CoilPricePublic]]:
    """``GET /admin/coil-prices`` — paginated, sorted, filtered coil price list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_coil_prices(query)
    return success(items, meta=meta)


async def create_coil_price_controller(
    body: CoilPriceCreate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CoilPricePublic]:
    """``POST /admin/coil-prices`` — create a new coil price."""
    item = await create_coil_price(body, actor_email=admin.emailid)
    return success(item, message="Coil price created")


async def get_coil_price_controller(
    coil_price_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CoilPricePublic]:
    """``GET /admin/coil-prices/{coil_price_id}`` — fetch a single coil price."""
    return success(await get_coil_price(coil_price_id))


async def update_coil_price_controller(
    coil_price_id: str,
    body: CoilPriceUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[CoilPricePublic]:
    """``PATCH /admin/coil-prices/{coil_price_id}`` — partial update."""
    item = await update_coil_price(coil_price_id, body, actor_email=admin.emailid)
    return success(item, message="Coil price updated")


async def delete_coil_price_controller(
    coil_price_id: str,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    """``DELETE /admin/coil-prices/{coil_price_id}`` — hard-delete a coil price."""
    await delete_coil_price(coil_price_id, actor_email=admin.emailid)
    return success(None, message="Coil price deleted")
