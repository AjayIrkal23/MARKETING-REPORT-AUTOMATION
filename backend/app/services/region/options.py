"""Region service: async combobox options search.

Returns up to ``query.limit`` (≤50) ``RegionOption`` entries whose name
matches the escaped free-text ``q`` (case-insensitive regex).  Results are
sorted ascending by name for stable UI display.
All user input is escaped with ``re.escape`` (``owasp-security``, ReDoS guard).
"""

from __future__ import annotations

import re
from typing import Any

from ...models.region import Region
from ...schemas.region import RegionOption, RegionOptionsQuery


async def search_region_options(query: RegionOptionsQuery) -> list[RegionOption]:
    """Return up to ``query.limit`` async combobox options filtered by name.

    Args:
        query: Contains optional free-text ``q`` (matched against ``name``
               via case-insensitive regex) and ``limit`` (1–50, default 20).

    Returns:
        List of ``RegionOption`` sorted by name ascending, each with:
        - ``value``: ``str(doc.id)``
        - ``label``: ``doc.name``
        - ``sublabel``: ``"{n} recipient(s) · Active/Inactive"``
    """
    filt: dict[str, Any] = {}
    if query.q:
        filt["name"] = {"$regex": re.escape(query.q), "$options": "i"}

    docs = (
        await Region.find(filt)
        .sort("+name")
        .limit(query.limit)
        .to_list()
    )
    return [
        RegionOption(
            value=str(doc.id),
            label=doc.name,
            sublabel=(
                f"{len(doc.emails)} recipient(s) · "
                f"{'Active' if doc.active else 'Inactive'}"
            ),
        )
        for doc in docs
    ]
