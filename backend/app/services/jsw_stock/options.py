"""JswStock domain: async combobox field-options search.

Returns up to ``query.limit`` (≤50) ``AsyncOption`` entries whose
``query.field`` value matches the escaped free-text ``q`` (case-insensitive
regex).  Results are de-duplicated (via ``distinct``), stripped of empty/None
values, sorted case-insensitively ascending, and capped to ``limit`` for stable
UI display.

All user input passed to ``$regex`` is escaped with ``re.escape``
(``owasp-security``, ReDoS guard, OWASP A05:2021).

Beanie 2.1.0 API note: ``JswStock.distinct(field, filter_dict)`` accepts the
filter as the **second positional argument** — do not pass it as a keyword
argument named ``filter`` (ADDENDUM BE-8; raises TypeError).

AsyncOption is imported exclusively from ``schemas.admin_user`` (BE-21).
"""

from __future__ import annotations

import re
from typing import Any

from ...models.jsw_stock import JswStock
from ...schemas.admin_user import AsyncOption
from ...schemas.jsw_stock import JswStockOptionsQuery


def _escape_regex(s: str) -> str:
    """Escape *s* for safe use in a MongoDB ``$regex`` value (ReDoS guard)."""
    return re.escape(s)


async def search_field_options(
    query: JswStockOptionsQuery,
) -> list[AsyncOption]:
    """Return up to ``query.limit`` distinct field values as combobox options.

    Calls ``JswStock.distinct(field, filter)`` — a Beanie Document classmethod
    that issues a single MongoDB ``distinct`` command and returns a flat list of
    unique values for the requested field.  ``None`` and whitespace-only values
    are dropped after retrieval; the remainder are sorted by their lower-cased
    string representation for stable, case-insensitive ordering before the
    ``limit`` cap is applied.

    Args:
        query: ``JswStockOptionsQuery`` containing:
               - ``field``: one of the five ``JswStockField`` literals
                 (``party_code`` | ``sales_order_type`` | ``customer_name`` |
                 ``sales_office`` | ``nco_declared``).
               - ``q``: optional free-text prefix matched against ``field``
                 via a case-insensitive escaped regex; absent → no filter.
               - ``limit``: maximum results to return (1–50, default 20).

    Returns:
        List of ``AsyncOption`` instances, each with ``value`` and ``label``
        set to the string-coerced field value.  List is sorted ascending
        (case-insensitive) and capped to ``query.limit``.
    """
    # Build filter: when q is present, apply case-insensitive regex on the
    # target field only.  No filter when q is absent → distinct over all docs.
    filt: dict[str, Any] = {}
    if query.q:
        filt[query.field] = {
            "$regex": _escape_regex(query.q),
            "$options": "i",
        }

    # Beanie 2.1.0: filter is the second POSITIONAL arg (ADDENDUM BE-8).
    # JswStock.distinct(query.field, filter=filt) -> TypeError (wrong)
    # JswStock.distinct(query.field, filt)        -> correct
    values: list[Any] = await JswStock.distinct(query.field, filt)

    # Dedupe/clean: drop None and blank strings; stringify remaining values.
    results: list[AsyncOption] = []
    for v in values:
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        results.append(AsyncOption(value=s, label=s))

    # Sort case-insensitively for stable UI presentation.
    results.sort(key=lambda o: o.label.lower())

    # Cap to requested limit (distinct may return more than limit items when
    # there is no q filter — enforce the cap here in Python).
    return results[: query.limit]
