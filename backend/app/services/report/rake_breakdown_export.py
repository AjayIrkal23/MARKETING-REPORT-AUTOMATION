"""Per-rake breakdown sheets for the combined report export.

Enumerates the region's unique RAKE values and, for each, runs the existing
``rake_drilldown`` and writes a "{RAKE} - Merged" and/or "{RAKE} - Unmerged"
premium sheet. Empty rakes (no stock on the date) still get a sheet with a
"(no rows)" note — full rake coverage, by product decision.

``# ponytail:`` this runs one drill-down (two Mongo queries) per rake; fine for
the ~8-rake regions in use. Batch into a single $in query if rake counts grow.
"""

from __future__ import annotations

from openpyxl.workbook.workbook import Workbook

from ...schemas.report import RakeDrilldownQuery
from ...utils.shared.excel_premium import safe_sheet_name, write_records_sheet
from .generate import _resolve_region_customers
from .rake_drilldown import rake_drilldown, row_identity

# (header, field, format-kind) for the two breakdown shapes.
_MERGED_COLUMNS: list[tuple[str, str, str]] = [
    ("SO Sales Org", "so_sales_org", "text"),
    ("Distr. Channel", "distr_chnl", "text"),
    ("BRANCH", "sales_office", "text"),
    ("Sold To Party", "sold_to_party", "text"),
    ("Party Code", "party_code", "text"),
    ("Transport Mode", "transport_mode", "text"),
    ("Destination", "destination", "text"),
    ("Customer Name", "customer_name", "text"),
    ("Quantity", "stock_quantity", "qty"),
]
_UNMERGED_COLUMNS: list[tuple[str, str, str]] = [
    ("Source", "stock_type", "center"),
    ("SO Sales Org", "so_sales_org", "text"),
    ("Distr. Channel", "distr_chnl", "text"),
    ("BRANCH", "sales_office", "text"),
    ("Sold To Party", "sold_to_party", "text"),
    ("Party Code", "party_code", "text"),
    ("Ship To Party", "ship_to_party", "text"),
    ("Transport Mode", "transport_mode", "text"),
    ("Destination", "destination", "text"),
    ("Customer Name", "customer_name", "text"),
    ("Quantity", "stock_quantity", "qty"),
]


def _write_one(
    wb: Workbook,
    used: set[str],
    *,
    rake: str,
    date: str,
    suffix: str,
    kind_label: str,
    rows: list,
    columns: list[tuple[str, str, str]],
    total_qty: float,
    subtitle: str,
) -> None:
    """Write one breakdown sheet; empty rakes render a placeholder note row."""
    ws = wb.create_sheet(title=safe_sheet_name(rake, used, suffix=suffix))
    n_cols = len(columns)
    if rows:
        total_row = ["Total"] + [""] * (n_cols - 2) + [round(total_qty, 3)]
        note = None
    else:
        total_row = None
        note = f"No rows for RAKE {rake} on {date}."
    write_records_sheet(
        ws,
        banner_title=f"RAKE {rake} — {kind_label} Breakdown",
        subtitle=subtitle,
        columns=columns,
        docs=rows,
        total_row=total_row,
        note=note,
    )


def _keep(rows: list, excluded: set[str] | None) -> tuple[list, float]:
    """Drop rows whose identity is unchecked; return (kept_rows, recomputed_total)."""
    kept = rows if not excluded else [r for r in rows if row_identity(r) not in excluded]
    return kept, round(sum(r.stock_quantity for r in kept), 3)


async def write_rake_breakdown_sheets(
    wb: Workbook,
    query,
    *,
    merged: bool,
    unmerged: bool,
    exclusions: dict[str, set[str]] | None = None,
) -> None:
    """Add merged/unmerged breakdown sheets for every unique region RAKE to *wb*.

    ``exclusions`` (RAKE → set of ``row_identity`` keys) omits user-unchecked rows
    and recomputes each sheet's Total from the survivors (browser-only exclusions).
    """
    excl = exclusions or {}
    region_name, _codes, _first_doc, rakes = await _resolve_region_customers(
        query.region_id
    )
    used = {ws.title for ws in wb.worksheets}
    subtitle = (
        f"Report Date: {query.date}  |  Region: {region_name}  |  "
        f"Days Filter: {query.days}"
    )

    # One drill-down per rake, cached so merged + unmerged share the same result.
    results: list[tuple[str, object]] = []
    for raw in rakes:
        rake = (raw or "").strip()
        if not rake:
            continue
        result = await rake_drilldown(
            RakeDrilldownQuery(
                rake=rake, date=query.date, region_id=query.region_id, days=query.days
            )
        )
        results.append((rake, result))

    # All merged sheets first, then all unmerged — matches the two picker options.
    if merged:
        for rake, result in results:
            rows, total = _keep(result.merged_rows, excl.get(rake))
            _write_one(
                wb, used, rake=rake, date=query.date, suffix=" - Merged",
                kind_label="Merged", rows=rows, columns=_MERGED_COLUMNS,
                total_qty=total, subtitle=subtitle,
            )
    if unmerged:
        for rake, result in results:
            rows, total = _keep(result.rows, excl.get(rake))
            _write_one(
                wb, used, rake=rake, date=query.date, suffix=" - Unmerged",
                kind_label="Unmerged", rows=rows, columns=_UNMERGED_COLUMNS,
                total_qty=total, subtitle=subtitle,
            )
