"""Export-time RAKE exclusion helpers — net browser-unchecked drill-down rows
out of the pivot + JSW/JVML sheets.

The browser sends a per-rake set of canonical 8-field identity strings (the same
``rake_drilldown.row_identity`` / frontend ``rake-exclusions.ts::rowKey`` key).
These helpers apply that set to the *other* sheets the export builds:

* the pivot (and the rake/transport totals derived from it) — rows whose identity
  is excluded are dropped and the totals recomputed from the survivors;
* the raw JSW/JVML stock docs — docs whose reconstructed identity is excluded are
  dropped (row-presence removal of the party's identity from the list).

Pure functions over already-fetched data — no DB, no I/O.
"""

from __future__ import annotations

from typing import Any

from ...schemas.report import CombinedExportBody, ReportResponse
from .generate import _compute_totals, _strip_or_none
from .rake_drilldown import _IDENTITY_FIELDS, row_identity


def excluded_key_union(body: CombinedExportBody | None) -> set[str]:
    """Flat union of every excluded identity key across all rakes (empty if none)."""
    if body is None:
        return set()
    keys: set[str] = set()
    for excl in body.exclusions.values():
        keys.update(excl.keys)
    return keys


def stock_doc_identity(doc: Any, first_doc: dict[str, Any]) -> str:
    """Canonical 8-field identity for a raw JSW/JVML stock doc.

    Mirrors ``rake_drilldown.row_identity`` byte-for-byte: party_code is the
    normalized code, transport_mode/destination come from the CustomerCode
    ``first_doc`` map (they are not on the stock row), values stripped, None → "".
    """
    nc = doc.party_code_normalized
    cc = first_doc.get(nc) if nc else None
    values = {
        "so_sales_org": _strip_or_none(doc.so_sales_org),
        "distr_chnl": _strip_or_none(doc.distr_chnl),
        "sales_office": _strip_or_none(doc.sales_office),
        "sold_to_party": _strip_or_none(doc.sold_to_party),
        "party_code": _strip_or_none(nc),
        "transport_mode": _strip_or_none(cc.transport_mode) if cc else None,
        "destination": _strip_or_none(cc.destination) if cc else None,
        "customer_name": _strip_or_none(doc.customer_name),
    }
    return chr(31).join((values[f] or "").strip() for f in _IDENTITY_FIELDS)


def apply_pivot_exclusions(report: ReportResponse, keys: set[str]) -> None:
    """Drop excluded pivot rows and recompute the grand + rake/transport totals
    in place. Pivot rows already carry all 8 identity fields, so no ``first_doc``
    is needed here. No-op when *keys* is empty."""
    if not keys:
        return
    report.rows = [r for r in report.rows if row_identity(r) not in keys]
    report.grand_total = sum(r.total for r in report.rows)
    report.grand_nco_yes_do = sum(r.nco_yes_do for r in report.rows)
    reqs = [r.required_credit for r in report.rows if r.required_credit is not None]
    report.grand_required_credit = sum(reqs) if reqs else None
    report.rake_totals, report.transport_mode_totals = _compute_totals(report.rows)


def filter_stock_docs(docs: list[Any], first_doc: dict[str, Any], keys: set[str]) -> list[Any]:
    """Drop stock docs whose reconstructed identity is excluded (no-op if empty)."""
    if not keys:
        return docs
    return [d for d in docs if stock_doc_identity(d, first_doc) not in keys]
