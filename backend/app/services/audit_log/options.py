"""Audit log read-service: async combobox options and filter facets.

Contract: §A10 of SPEC.md.
``search_audit_options`` — server-side search-as-you-type for the backend-
driven ``AsyncCombobox``.  Results blend distinct ``actor_email``, ``path``,
and ``action`` values from recent logs, capped to ``query.limit`` (≤200).
``get_facets`` — returns filter facet enums.  Category/outcome/source are
static Literal lists; ``methods`` are fetched via ``AuditLog.distinct``.
All user input is escaped with ``re.escape`` (``owasp-security``, ReDoS guard).
"""

from __future__ import annotations

import re
from typing import Any

from ...models.audit_log import AuditLog
from ...schemas.audit_log import (
    AuditFacets,
    AuditOptionsQuery,
    AsyncOption,
)

# ---------------------------------------------------------------------------
# Static enum lists (must match the Literal definitions in the model/schema)
# ---------------------------------------------------------------------------

_CATEGORIES: list[str] = ["http", "auth", "admin", "data", "system", "cron", "security", "regions", "customer_codes"]
_OUTCOMES: list[str] = ["success", "failure", "error"]
_SOURCES: list[str] = ["http", "system", "cron", "service"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _regex_filt(q: str) -> dict[str, Any]:
    """Build a case-insensitive ``$regex`` filter for a single field."""
    return {"$regex": re.escape(q), "$options": "i"}


async def _distinct_options(
    field: str,
    sublabel: str,
    q: str | None,
    cap: int,
) -> list[AsyncOption]:
    """Return up to *cap* ``AsyncOption`` entries from distinct values of *field*.

    Filters to documents where *field* matches the escaped *q* regex (when
    provided), discards ``None`` / empty values, and converts each to an
    ``AsyncOption`` with the field value used for both ``value`` and ``label``.
    """
    filt: dict[str, Any] = {field: {"$ne": None}}
    if q:
        filt[field] = {"$regex": re.escape(q), "$options": "i"}

    # Beanie 2.x: distinct() is a Document classmethod (NOT on FindMany);
    # it proxies pymongo collection.distinct(key, filter) and returns a list.
    values: list[Any] = await AuditLog.distinct(field, filt)

    options: list[AsyncOption] = []
    for v in values:
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        options.append(AsyncOption(value=s, label=s, sublabel=sublabel))
        if len(options) >= cap:
            break

    return options


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def search_audit_options(query: AuditOptionsQuery) -> list[AsyncOption]:
    """Return up to ``query.limit`` (≤200) async combobox options.

    Blends distinct values from three indexed fields — ``actor_email`` (sublabel
    "actor"), ``path`` (sublabel "route"), and ``action`` (sublabel "action") —
    matching the escaped free-text ``q`` when supplied.  Results are capped to
    ``query.limit`` total, allocated evenly across the three sources.
    Free-text ``q`` is escaped with ``re.escape`` before use (``owasp-security``).
    """
    per_source = max(1, query.limit // 3)
    q = query.q or None

    actor_opts = await _distinct_options("actor_email", "actor", q, per_source)
    path_opts = await _distinct_options("path", "route", q, per_source)
    action_opts = await _distinct_options("action", "action", q, per_source)

    combined = actor_opts + path_opts + action_opts
    return combined[: query.limit]


async def get_facets() -> AuditFacets:
    """Return filter facet enums for the audit log toolbar.

    ``categories``, ``outcomes``, and ``sources`` are the static Literal lists
    (A0) — they never change at runtime.  ``methods``, ``statuses``
    (distinct status_code, ascending), and ``actions`` (distinct action,
    sorted) are all fetched via ``AuditLog.distinct`` so they reflect only
    observed data; ``None`` values and empty strings are filtered out and each
    list is sorted for stable UI display.
    """
    raw_methods: list[Any] = await AuditLog.distinct(
        "method", {"method": {"$ne": None}}
    )

    methods = sorted(
        {str(m).strip().upper() for m in raw_methods if m is not None and str(m).strip()}
    )

    raw_statuses = await AuditLog.distinct("status_code", {"status_code": {"$ne": None}})
    statuses = sorted({int(s) for s in raw_statuses if s is not None})

    raw_actions = await AuditLog.distinct("action", {"action": {"$ne": None}})
    actions = sorted({str(a).strip() for a in raw_actions if a is not None and str(a).strip()})

    return AuditFacets(
        categories=_CATEGORIES,
        outcomes=_OUTCOMES,
        sources=_SOURCES,
        methods=methods,
        statuses=statuses,
        actions=actions,
    )
