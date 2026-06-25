# app/utils/jsw_stock/filters.py
"""Ingestion-time row gate for the jsw_stock domain.

A row from ZSD_CURRSTK_HR.xlsx is PERSISTED only when it passes every gate
below (JSW/JVML stock ingestion rules, 2026-06):

  1. Party-code match — the normalized Party Code must exist in the
     ``customer_codes`` master (``customer_map`` carries the resolved name).
  2. SO-Product Form — keep only ``S_HRCF`` (case-insensitive exact).
  3. Blocked — keep only when the Blocked quantity is exactly 0.
  4. Sales Order Type — drop ``ZAUF``, ``ZVSR``, and any ``ZRE<number>``
     (ZRE1, ZRE2, … ZREn).
  5. NCO Declared — keep ``No``; keep ``Yes`` ONLY when a real DO No. exists
     (length > 2, not a null placeholder like "NA"/"N/A"); drop ``Yes`` without.
  6. Usage Decision — drop ``NCO`` and ``COMMERCIAL``, EXCEPT rows that passed
     gate 5 as NCO=Yes+DO (those are kept for the NCO+DO report bucket).

Pure / transport-free — ``customer_map`` is resolved once in ingest.py and
passed in, so this module performs no I/O (``service-layer-standards``).
"""

from __future__ import annotations

import re
from typing import Any

# Keep-only product form (case-insensitive exact match).
_KEEP_PRODUCT_FORM = "S_HRCF"

# Sales Order Type denylist: exact codes + the ZRE<number> family.
_DENY_ORDER_TYPES = frozenset({"ZAUF", "ZVSR"})
_ZRE_NUMBERED = re.compile(r"ZRE\d+")

# Usage Decision denylist (drop NCO / COMMERCIAL — non-prime / commercial stock).
_DENY_USAGE_DECISIONS = frozenset({"NCO", "COMMERCIAL"})

# Null-like DO No strings that are not real delivery order references.
_NULL_DO_STRINGS = frozenset({"na", "n/a", "none", "nil", "-", "n.a."})


def _is_valid_do_no(raw: Any) -> bool:
    if raw is None:
        return False
    s = str(raw).strip()
    return len(s) > 2 and s.lower() not in _NULL_DO_STRINGS


def should_keep_row(
    coerced: dict[str, Any],
    pcode_norm: str | None,
    customer_map: dict[str, tuple[str | None, str | None]],
) -> bool:
    """Return ``True`` when *coerced* passes every ingestion gate.

    Args:
        coerced:      Row with every column already run through ``coerce_value``.
        pcode_norm:   Party Code after ``lstrip("0")`` (``None`` when blank).
        customer_map: ``{normalized_code: (customer_name, code_id)}`` from the
                      ``customer_codes`` master — membership is the match gate.

    Returns:
        ``True`` to persist the row, ``False`` to reject it.
    """
    # 1. Party code must map to a known customer.
    if not pcode_norm or pcode_norm not in customer_map:
        return False

    # 2. SO-Product Form must be exactly S_HRCF.
    product_form = (coerced.get("so_product_form") or "").strip().upper()
    if product_form != _KEEP_PRODUCT_FORM:
        return False

    # 3. Blocked quantity must be exactly 0.
    blocked = coerced.get("blocked")
    if blocked is None or blocked != 0:
        return False

    # 4. Sales Order Type denylist (ZAUF / ZVSR / ZRE<number>).
    order_type = (coerced.get("sales_order_type") or "").strip().upper()
    if order_type in _DENY_ORDER_TYPES or _ZRE_NUMBERED.fullmatch(order_type):
        return False

    # 5. NCO logic: keep "No"; keep "Yes" only with a real DO No.; drop "Yes" w/o DO.
    nco = (coerced.get("nco_declared") or "").strip().lower()
    nco_yes_with_do = False
    if nco == "yes":
        if not _is_valid_do_no(coerced.get("do_no")):
            return False
        nco_yes_with_do = True

    # 6. Usage Decision denylist — drop NCO / COMMERCIAL, but spare NCO+DO rows.
    if not nco_yes_with_do:
        usage = (coerced.get("usage_decision") or "").strip().upper()
        if usage in _DENY_USAGE_DECISIONS:
            return False

    return True
