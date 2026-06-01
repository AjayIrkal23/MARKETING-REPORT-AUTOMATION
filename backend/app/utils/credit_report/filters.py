# app/utils/credit_report/filters.py
"""Ingestion-time row gate for the credit_report domain.

A row from credit report.XLSX is PERSISTED only when it passes every gate
below:

  1. Customer Name — must be non-empty.
  2. Credit Control Area — must be one of the two ingested CCAs: JV0H or VJ0H
     (case-insensitive).

Pure / transport-free — no I/O in this module (``service-layer-standards``).
"""

from __future__ import annotations

from typing import Any

_ALLOWED_CCA = frozenset({"JV0H", "VJ0H"})


def should_keep_row(coerced: dict[str, Any]) -> bool:
    """Keep a credit-report row only when it has a customer name AND its
    Credit Control Area is one of the two we ingest (JV0H / VJ0H)."""
    name = (coerced.get("customer_name") or "")
    if not str(name).strip():
        return False
    cca = (coerced.get("credit_control_area") or "").strip().upper()
    return cca in _ALLOWED_CCA
