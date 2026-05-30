"""User-domain controllers (thin: call service, wrap in envelope)."""

from __future__ import annotations

from fastapi import Depends, Request

from ..core.errors import ValidationError
from ..core.responses import SuccessEnvelope, success
from ..schemas.user import UserListQuery, UserPublic
from ..services.user.list import list_users

# Whitelisted query keys for GET /users; anything else is rejected.
_ALLOWED_USER_QUERY_KEYS = {"page", "limit", "sortBy", "sortOrder", "q"}


async def list_users_controller(
    request: Request,
    query: UserListQuery = Depends(),
) -> SuccessEnvelope[list[UserPublic]]:
    unknown = set(request.query_params.keys()) - _ALLOWED_USER_QUERY_KEYS
    if unknown:
        raise ValidationError(
            f"Unknown query parameter(s): {', '.join(sorted(unknown))}"
        )
    items, meta = await list_users(query)
    return success(items, meta=meta)
