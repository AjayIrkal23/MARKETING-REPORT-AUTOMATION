"""Region-domain controllers (thin: call service, wrap in envelope).

One controller per endpoint; each:
- Receives validated inputs via FastAPI Depends.
- Calls the appropriate service function (all DB/business logic lives there).
- Wraps the result in a ``success()`` envelope.

Unknown query-param rejection on list and options endpoints mirrors the
pattern in ``controllers/audit_log.py`` (allowed keys defined via
``_ALLOWED_*`` frozensets; anything extra raises ``ValidationError`` 400).
Contract: .planning/regions/SPEC.md §1.5.
"""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.auth_deps import get_current_admin
from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.auth import AuthUser
from ..schemas.region import (
    RegionCreate,
    RegionListQuery,
    RegionOption,
    RegionOptionsQuery,
    RegionPublic,
    RegionUpdate,
)
from ..services.region.create import create_region
from ..services.region.delete import delete_region
from ..services.region.get import get_region
from ..services.region.list import list_regions
from ..services.region.options import search_region_options
from ..services.region.update import update_region

# Whitelists for unknown-key rejection (backend-api-standards).
_ALLOWED_LIST_KEYS = frozenset({
    "page", "limit", "sortBy", "sortOrder", "q", "active",
})

_ALLOWED_OPTION_KEYS = frozenset({"q", "limit"})


async def list_regions_controller(
    request: Request,
    query: RegionListQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionPublic]]:
    """``GET /admin/regions`` — paginated, sorted, filtered region list."""
    unknown = set(request.query_params.keys()) - _ALLOWED_LIST_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_regions(query)
    return success(items, meta=meta)


async def region_options_controller(
    request: Request,
    query: RegionOptionsQuery = Depends(),
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[list[RegionOption]]:
    """``GET /admin/regions/options`` — async combobox options (≤50)."""
    unknown = set(request.query_params.keys()) - _ALLOWED_OPTION_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    options = await search_region_options(query)
    return success(options)


async def create_region_controller(
    body: RegionCreate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """``POST /admin/regions`` — create a new region."""
    region = await create_region(body, actor_email=admin.emailid)
    return success(region, message="Region created")


async def get_region_controller(
    region_id: str,
    _admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """``GET /admin/regions/{region_id}`` — fetch a single region by ObjectId."""
    return success(await get_region(region_id))


async def update_region_controller(
    region_id: str,
    body: RegionUpdate,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[RegionPublic]:
    """``PATCH /admin/regions/{region_id}`` — partial update of a region."""
    region = await update_region(region_id, body, actor_email=admin.emailid)
    return success(region, message="Region updated")


async def delete_region_controller(
    region_id: str,
    admin: AuthUser = Depends(get_current_admin),
) -> SuccessEnvelope[None]:
    """``DELETE /admin/regions/{region_id}`` — hard-delete a region."""
    await delete_region(region_id, actor_email=admin.emailid)
    return success(None, message="Region deleted")
