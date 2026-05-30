"""User-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from fastapi import Depends

from ..core.responses import SuccessEnvelope, success
from ..schemas.user import UserListQuery, UserPublic
from ..services.user.list import list_users


async def list_users_controller(
    query: UserListQuery = Depends(),
) -> SuccessEnvelope[list[UserPublic]]:
    items, meta = await list_users(query)
    return success(items, meta=meta)
