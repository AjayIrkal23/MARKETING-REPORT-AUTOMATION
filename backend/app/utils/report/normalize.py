"""Canonical SAP customer/party code normalization.

A single source of truth for the leading-zero stripping used to join the three
code shapes that appear across the system:

  - stock ``party_code``          → zero-padded, e.g. ``"0000008481"``
  - customer_codes ``code``       → trimmed, e.g. ``"40020365"`` / ``"8451"``
  - credit_report ``customer``    → trimmed, e.g. ``"40007312"``

Stripping leading zeros (``lstrip("0")``) yields the canonical key that matches
across all three (the "00" mismatch the Report feature must not trip on). The
stock domain stores ``party_code_normalized`` (already lstripped at ingest); the
ingest pollers reuse this exact function so all three sites stay in lockstep.
"""

from __future__ import annotations

from typing import Any


def normalize_code(raw: Any) -> str | None:
    """Strip leading zeros from a SAP code; ``None`` for empty/all-zero input.

    Args:
        raw: A code value (str, int, float, or None) from any of the three
            sources. Numeric values are stringified and trimmed first.

    Returns:
        The leading-zero-stripped string, or ``None`` when *raw* is None, blank,
        or reduces to empty after the strip (e.g. an all-zero value).
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    normalized = s.lstrip("0")
    return normalized or None
