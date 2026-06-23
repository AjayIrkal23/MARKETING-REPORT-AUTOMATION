# app/utils/credit_report/filters.py
"""Ingestion-time row gate for the credit_report domain.

A row from credit report.XLSX is PERSISTED only when it passes every gate
below:

  1. Customer Name — must be non-empty.
  2. Credit Control Area — must be one of the three ingested CCAs: JV0H,
     VJ0H, or 1000 (case-insensitive).

The three CCAs are grouped at query time into plants:
  - JSW  → VJ0H + 1000
  - JVML → JV0H

Pure / transport-free — no I/O in this module (``service-layer-standards``).
"""

from __future__ import annotations

from typing import Any

_ALLOWED_CCA = frozenset({"JV0H", "VJ0H", "1000"})


def should_keep_row(coerced: dict[str, Any]) -> bool:
    """Keep a credit-report row only when it has a customer name AND its
    Credit Control Area is one of the three we ingest (JV0H / VJ0H / 1000)."""
    name = (coerced.get("customer_name") or "")
    if not str(name).strip():
        return False
    cca = (coerced.get("credit_control_area") or "").strip().upper()
    return cca in _ALLOWED_CCA
