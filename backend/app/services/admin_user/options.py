"""Admin user-domain business logic: async combobox option search.

Contract: §3.8 / §3.9 / §4.6 of USER-MANAGEMENT-PLAN.md.
``GET /admin/users/options`` — server-side search-as-you-type for the backend-
driven async combobox (``AsyncCombobox`` on the frontend).  Hard-capped at 200
results per the frontend contract (``UserOptionsQuery.limit`` le=200).
``label`` = display name (fallback to email), ``value`` = str(id), ``sublabel``
= email for secondary display when name differs.
"""

from __future__ import annotations

import re
from typing import Any

from ...models.user import User
from ...schemas.admin_user import AsyncOption, UserOptionsQuery


async def search_options(query: UserOptionsQuery) -> list[AsyncOption]:
    """Return up to ``query.limit`` (≤200) async combobox options.

    Free-text ``q`` is matched case-insensitively against both ``name`` and
    ``emailid`` using an escaped regex (``owasp-security``, ReDoS guard).
    When ``q`` is absent or empty all users are eligible (up to the limit).
    Results are sorted by ``name`` ascending for predictable combobox UX.
    """
    filt: dict[str, Any] = {}
    if query.q:
        escaped = re.escape(query.q)
        regex_doc = {"$regex": escaped, "$options": "i"}
        filt["$or"] = [
            {"name": regex_doc},
            {"emailid": regex_doc},
        ]

    docs = (
        await User.find(filt)
        .sort("+name")
        .limit(query.limit)
        .to_list()
    )

    options: list[AsyncOption] = []
    for doc in docs:
        label = doc.name if doc.name else str(doc.emailid)
        sublabel = str(doc.emailid) if doc.name else None
        options.append(
            AsyncOption(
                value=str(doc.id),
                label=label,
                sublabel=sublabel,
            )
        )

    return options
