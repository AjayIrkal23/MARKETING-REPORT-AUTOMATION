"""Report JSW/JVML pivot sheet writer (``write_pivot_sheet``).

Builds the grouped RAKE-pivot sheet — repeated parents blanked, per-group
subtotals, a Grand Total, premium styling. Consumed by the combined report
export (``export_combined``); there is no standalone report .xlsx endpoint.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ...schemas.report import ReportResponse
from ...utils.report.excel_style import (
    ALIGN_CENTER,
    ALIGN_LEFT,
    ALIGN_RIGHT,
    add_title_banner,
    apply_credit_balance_font,
    apply_pivot_view,
    apply_status_font,
    auto_size_columns,
    enable_table_filter,
    fmt_inr,
    fmt_quantity,
    freeze_header_and_fixed_cols,
    setup_print_page,
    style_data_row,
    style_grand_total_row,
    style_premium_header_row,
    style_subtotal_row,
)


# Fixed row fields in display order. BRANCH (Sales Office) sits right after
# Distr. Channel — a grouped pivot column heading its items, above Sold To Party.
_FIXED_HEADERS = [
    "Distr. Channel",
    "BRANCH",
    "Sold To Party",
    "Party Code",
    "Ship To Party",
    "Transport Mode",
    "Destination",
    "ROUTE",
]

# Number of leading fixed columns (always shown, eligible for blanking).
_FIXED_COL_COUNT = 5

# Fixed trailing columns after the dynamic RAKE columns.
_TRAILING_HEADERS = [
    "Total",
    "Yes+DO",
    "Blocked",
    "Credit Balance",
    "Required Credit",
    "Credit Note",
]

# Optional-column key aligned to each header position (None ⇒ always shown). The
# export `columns` filter (the same keys the UI toggles) gates the non-None ones:
# the 5 fixed left cols are always shown; the 3 detail cols, the dynamic RAKE
# block (one shared "rake" key, see _kept_indices), and the 6 trailing cols
# (Total included) are toggleable.
_FIXED_OPT_KEYS: list[str | None] = [None, None, None, None, None, "transport_mode", "destination", "route"]
_TRAILING_OPT_KEYS: list[str | None] = ["total", "yes_do", "blocked", "credit_balance", "required_credit", "credit_note"]

# Headers that carry numeric (quantity) formatting.
_QUANTITY_HEADERS = {"Total", "Yes+DO"}

# Headers that carry INR currency formatting.
_INR_HEADERS = {"Credit Balance", "Required Credit"}

# Headers whose text should be centred.
_CENTER_HEADERS = {"Blocked", "Credit Note"}


def _kept_indices(
    rake_n: int, visible: set[str] | None, fixed_opt_keys: list[str | None]
) -> list[int]:
    """Column indices to keep. visible=None ⇒ all columns; else always-on + visible keys."""
    # RAKE columns share one "rake" toggle key, so the `columns` filter hides the
    # whole block when it's off (visible=None still keeps them for old clients).
    keys = fixed_opt_keys + ["rake"] * rake_n + _TRAILING_OPT_KEYS
    if visible is None:
        return list(range(len(keys)))
    return [i for i, k in enumerate(keys) if k is None or k in visible]


def _sel(values: list[Any], kept: list[int]) -> list[Any]:
    return [values[i] for i in kept]


def _fmt_blocked(blocked: bool | None, credit_status: str) -> str:
    """Blocked cell text matching the frontend: Blocked / No / N/A."""
    if credit_status == "NO CREDIT REPORT FOUND":
        return "N/A"
    if blocked is None:
        return ""
    return "Blocked" if blocked else "No"


def _fmt_credit_balance(balance: float | None, credit_status: str) -> float | str:
    """Credit Balance value or status text when no report/balance exists."""
    if balance is not None:
        return balance
    if credit_status == "NO CREDIT REPORT FOUND":
        return "NO CREDIT REPORT FOUND"
    if credit_status == "No Credit balance":
        return "No Credit balance"
    return ""


def _fmt_num(value: float | None) -> float | str:
    return "" if value is None else value


# Leading fixed cols eligible for repeated-parent blanking (mirrors the frontend
# FIXED_COL_KEYS in report-grouping.ts). The 3 detail cols always show.
# BRANCH (sales_office) is 2nd so it groups under Distr. Channel, above Sold To Party.
_BLANK_KEYS = ("distr_chnl", "sales_office", "sold_to_party", "party_code", "ship_to_party")


def _group_key(row: Any, group_by_so: bool) -> tuple[str, ...]:
    """Group identity. Both mode: SO Sales Org alone; else SO Sales Org + Distr.Chnl."""
    if group_by_so:
        return (row.so_sales_org or "",)
    return (row.so_sales_org or "", row.distr_chnl or "")


def _blank_flags(row: Any, prev: Any | None, keys: tuple[str, ...]) -> dict[str, bool]:
    """Blank a leading fixed cell while the whole parent chain above also matches."""
    flags: dict[str, bool] = {}
    parent_same = prev is not None
    for key in keys:
        same = parent_same and prev is not None and getattr(prev, key) == getattr(row, key)
        flags[key] = same
        parent_same = same
    return flags


def _empty_agg() -> dict[str, Any]:
    return {"rake": {}, "total": 0.0, "nco_yes_do": 0.0, "required_credit": None}


def _add_to_agg(agg: dict[str, Any], row: Any) -> None:
    for col, val in row.rake_quantities.items():
        agg["rake"][col] = agg["rake"].get(col, 0.0) + (val or 0.0)
    agg["total"] += row.total or 0.0
    agg["nco_yes_do"] += row.nco_yes_do or 0.0
    if row.required_credit is not None:
        agg["required_credit"] = (agg["required_credit"] or 0.0) + row.required_credit


def _fixed_cells(row: Any, flags: dict[str, bool], group_by_so: bool) -> list[Any]:
    """The fixed/detail cells; blanked parents render empty, detail cols always show.

    Both mode prepends an SO Sales Org cell (also blanked while it repeats).
    """
    cells: list[Any] = []
    if group_by_so:
        cells.append("" if flags["so_sales_org"] else (row.so_sales_org or ""))
    cells += [
        "" if flags["distr_chnl"] else (row.distr_chnl or ""),
        "" if flags["sales_office"] else (row.sales_office or ""),
        "" if flags["sold_to_party"] else (row.sold_to_party or ""),
        "" if flags["party_code"] else row.party_code,
        "" if flags["ship_to_party"] else (row.ship_to_party or ""),
        row.transport_mode or "",
        row.destination or "",
        row.route or "",
    ]
    return cells


def _append_subtotal(
    ws,
    report: ReportResponse,
    agg: dict[str, Any],
    label: str | None,
    kept: list[int],
    fixed_n: int,
) -> None:
    """Group subtotal row: '{label} Total' in the first fixed col; RAKE/Total/Yes+DO/Required summed.

    *label* is the Distr.Channel (single mode) or SO Sales Org (Both mode);
    *fixed_n* is the number of leading fixed/detail columns to pad past.
    """
    sub: list[Any] = [f"{label or '—'} Total"] + [""] * (fixed_n - 1)
    sub += [agg["rake"].get(col, 0.0) or "" for col in report.rake_columns]
    sub += [
        _fmt_num(agg["total"]),
        _fmt_num(agg["nco_yes_do"]),
        "",
        "",
        _fmt_num(agg["required_credit"]),
        "",
    ]
    ws.append(_sel(sub, kept))


def _write_report(
    ws, report: ReportResponse, visible: set[str] | None
) -> tuple[list[str], list[str], int]:
    """Write the grouped pivot to *ws*: title banner + header + data rows (repeated
    parents blanked) + per-group subtotal rows + a Grand Total.

    Single mode groups by Distr.Channel; Both mode (``report_type="both"``) leads
    with an SO Sales Org column and groups by SO Sales Org. Returns the final
    header labels, the active RAKE column names, and the leading fixed-column
    count (for the styling pass).
    """
    group_by_so = report.report_type == "both"
    fixed_headers = (["SO Sales Org", *_FIXED_HEADERS]) if group_by_so else _FIXED_HEADERS
    fixed_opt_keys = ([None, *_FIXED_OPT_KEYS]) if group_by_so else _FIXED_OPT_KEYS
    fixed_col_count = _FIXED_COL_COUNT + 1 if group_by_so else _FIXED_COL_COUNT
    blank_keys = ("so_sales_org", *_BLANK_KEYS) if group_by_so else _BLANK_KEYS
    fixed_n = len(fixed_headers)

    kept = _kept_indices(len(report.rake_columns), visible, fixed_opt_keys)
    headers = fixed_headers + report.rake_columns + _TRAILING_HEADERS
    filtered_headers = _sel(headers, kept)
    n_cols = len(filtered_headers)

    # Title banner occupies rows 1-2; the table starts at row 3.
    if group_by_so:
        report_label = "JSW + JVML"
    else:
        report_label = "JSW" if report.report_type.lower() == "jsw" else "JVML"
    title = f"{report_label} Coil Stock Report"
    subtitle = (
        f"Report Date: {report.date}  |  Region: {report.region_name}  |  "
        f"Days Filter: {report.days_filter}  |  Exported: "
        f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )
    add_title_banner(ws, 1, n_cols, title, subtitle)

    # Header row.
    ws.append(filtered_headers)

    prev: Any | None = None
    agg = _empty_agg()

    for row in report.rows:
        if prev is not None and _group_key(prev, group_by_so) != _group_key(row, group_by_so):
            label = prev.so_sales_org if group_by_so else prev.distr_chnl
            _append_subtotal(ws, report, agg, label, kept, fixed_n)
            agg = _empty_agg()
            prev = None  # new group → show the full parent chain again

        full = (
            _fixed_cells(row, _blank_flags(row, prev, blank_keys), group_by_so)
            + [row.rake_quantities.get(col, 0.0) or "" for col in report.rake_columns]
            + [
                _fmt_num(row.total),
                _fmt_num(row.nco_yes_do),
                _fmt_blocked(row.blocked, row.credit_status),
                _fmt_credit_balance(row.credit_balance, row.credit_status),
                _fmt_num(row.required_credit),
                row.credit_note,
            ]
        )
        ws.append(_sel(full, kept))
        _add_to_agg(agg, row)
        prev = row

    if prev is not None:
        label = prev.so_sales_org if group_by_so else prev.distr_chnl
        _append_subtotal(ws, report, agg, label, kept, fixed_n)

    # Grand total row (credit money is intentionally NOT summed).
    total_row: list[Any] = ["Grand Total"] + [""] * (fixed_n - 1)
    total_row += [""] * len(report.rake_columns)
    total_row += [
        _fmt_num(report.grand_total),
        _fmt_num(report.grand_nco_yes_do),
        "",
        "",
        _fmt_num(report.grand_required_credit),
        "",
    ]
    ws.append(_sel(total_row, kept))

    return filtered_headers, report.rake_columns, fixed_col_count


def _apply_column_formats(
    ws: Worksheet, row_idx: int, headers: list[str], rake_columns: list[str]
) -> None:
    """Apply numeric/INR formats, alignments and conditional font colours per column."""
    quantity_headers = _QUANTITY_HEADERS | set(rake_columns)

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=row_idx, column=col_idx)

        if header in quantity_headers:
            cell.alignment = ALIGN_RIGHT
            fmt_quantity(cell)
            continue

        if header in _INR_HEADERS:
            cell.alignment = ALIGN_RIGHT
            if isinstance(cell.value, (int, float)):
                fmt_inr(cell)
            if header == "Credit Balance":
                apply_credit_balance_font(cell)
            continue

        if header == "Blocked":
            cell.alignment = ALIGN_CENTER
            apply_status_font(cell, str(cell.value))
            continue

        if header == "Credit Note":
            cell.alignment = ALIGN_CENTER
            apply_status_font(cell, str(cell.value))
            continue

        # Default text columns.
        cell.alignment = ALIGN_LEFT


def _style_report(
    ws: Worksheet, headers: list[str], rake_columns: list[str], fixed_col_count: int
) -> None:
    """Apply premium styling to the worksheet after all data has been written."""
    n_cols = len(headers)
    header_row = 3

    # Header.
    style_premium_header_row(ws, header_row, n_cols)

    # Body rows: identify by content and apply group alternation.
    group_idx = 0
    for row_idx in range(header_row + 1, ws.max_row + 1):
        first_val = ws.cell(row=row_idx, column=1).value

        if first_val == "Grand Total":
            style_grand_total_row(ws, row_idx, n_cols, fixed_col_count)
            continue

        if isinstance(first_val, str) and first_val.endswith(" Total"):
            style_subtotal_row(ws, row_idx, n_cols, fixed_col_count)
            group_idx += 1
            continue

        is_alt_group = group_idx % 2 == 1
        style_data_row(ws, row_idx, n_cols, is_alt_group=is_alt_group)
        _apply_column_formats(ws, row_idx, headers, rake_columns)
        # Detail rows sit one outline level below their subtotal so each channel
        # group collapses/expands with Excel's native +/- buttons (pivot feel).
        ws.row_dimensions[row_idx].outline_level = 1

    # Column-specific alignment overrides for the header row.
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx)
        if header in _QUANTITY_HEADERS or header in _INR_HEADERS or header in _CENTER_HEADERS:
            cell.alignment = ALIGN_CENTER if header in _CENTER_HEADERS else ALIGN_RIGHT
        else:
            cell.alignment = ALIGN_LEFT

    # Layout — pivot canvas (no gridlines, collapsible groups), header-only freeze
    # (no fixed/frozen columns), auto-filter and auto-sized columns.
    apply_pivot_view(ws)
    enable_table_filter(ws, header_row, n_cols, ws.max_row)
    freeze_header_and_fixed_cols(ws, header_row, 0)
    ws.row_dimensions[header_row].height = 26
    auto_size_columns(ws)


def write_pivot_sheet(
    wb, report: ReportResponse, visible: set[str] | None, sheet_title: str
) -> None:
    """Write the grouped premium pivot into a new *sheet_title* sheet on *wb*.

    Shared by the standalone ``/report/export`` and the combined report export so
    the pivot is built+styled in exactly one place. *visible* is the optional
    column filter (None ⇒ all). The in-sheet title banner is set inside
    ``_write_report`` from the report type; *sheet_title* is the worksheet tab.
    """
    ws = wb.create_sheet(title=sheet_title)
    headers, rake_columns, fixed_col_count = _write_report(ws, report, visible)
    _style_report(ws, headers, rake_columns, fixed_col_count)
    setup_print_page(ws, sheet_title)
