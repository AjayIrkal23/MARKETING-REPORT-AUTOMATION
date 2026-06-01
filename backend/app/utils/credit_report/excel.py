"""Raw-zip Excel parser for Credit Report workbook.

Uses stdlib zipfile + xml.etree.ElementTree — does NOT use openpyxl.
Tolerant of malformed numeric cells (keeps non-floatable <v> text as-is).
Returns raw {field: raw_value} dicts; callers apply coerce_value().
"""

from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Any

from .columns import HEADER_TO_FIELD

# OOXML spreadsheet namespace
_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
_NSP = f"{{{_NS}}}"  # '{http://...}' prefix for ElementTree tag matching


def _col_index(ref: str) -> int:
    """Convert a cell ref like 'A1', 'BQ12' to a 0-based column index.

    Extracts the leading alpha characters, interprets as base-26.
    'A' -> 0, 'Z' -> 25, 'AA' -> 26, 'BQ' -> 68.
    """
    letters = ""
    for ch in ref:
        if ch.isalpha():
            letters += ch
        else:
            break
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch.upper()) - ord("A") + 1)
    return idx - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    """Parse xl/sharedStrings.xml into a list indexed by shared-string id.

    Concatenates all <t> text runs within each <si> element to handle
    rich-text cells (multiple <r><t> fragments per string).
    """
    try:
        xml_bytes = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []  # workbook has no shared strings (all numeric)

    root = ET.fromstring(xml_bytes)
    shared: list[str] = []
    for si in root.findall(f"{_NSP}si"):
        parts = [t.text or "" for t in si.iter(f"{_NSP}t")]
        shared.append("".join(parts))
    return shared


def _resolve_cell(
    c_el: ET.Element,
    shared: list[str],
) -> Any:
    """Resolve a <c> element to its Python value.

    t attr semantics (OOXML §18.18.11):
      s         -> shared string index in <v>
      inlineStr -> inline string in <is><t>
      str       -> formula result string in <v>
      b         -> boolean in <v> ('0'/'1')
      (absent)  -> numeric (float) in <v>; keep as float if parseable,
                   else keep raw string (malformed-cell guard per SPEC)

    Returns None when <v> is absent (e.g. CP End Date empty rows).
    """
    t_attr = c_el.get("t", "")
    v_el = c_el.find(f"{_NSP}v")

    if t_attr == "s":
        # Shared string
        if v_el is None or v_el.text is None:
            return None
        return shared[int(v_el.text)]

    if t_attr == "inlineStr":
        is_el = c_el.find(f"{_NSP}is")
        if is_el is None:
            return None
        t_el = is_el.find(f"{_NSP}t")
        return t_el.text if t_el is not None else None

    if t_attr in ("str", "b"):
        return v_el.text if v_el is not None else None

    # Numeric (t absent or empty string)
    if v_el is None or v_el.text is None:
        return None
    raw = v_el.text.strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        # Non-floatable numeric cell — keep verbatim (malformed-cell guard)
        return raw


def parse_workbook(data: bytes) -> list[dict[str, Any]]:
    """Parse raw .xlsx bytes into a list of field-keyed dicts.

    Steps:
      1. Open zip in memory.
      2. Build shared-strings list from xl/sharedStrings.xml.
      3. Stream xl/worksheets/sheet1.xml row-by-row.
      4. Row 1: build index->field map using HEADER_TO_FIELD (drop unmapped).
      5. Data rows: resolve each cell, skip fully-empty rows,
         return {field: raw_value} (raw — coerce_value applied by caller).

    Does NOT use openpyxl. Safe against the '#VALUE!' cells that arrive as
    shared strings with t='s', resolved to their string value here.

    Returns:
        List of dicts, one per non-empty data row. Values are raw:
        str (from shared strings), float (numeric cells), or None.
    """
    zf = zipfile.ZipFile(io.BytesIO(data))

    shared = _read_shared_strings(zf)

    ws_bytes = zf.read("xl/worksheets/sheet1.xml")
    root = ET.fromstring(ws_bytes)
    sheet_data = root.find(f"{_NSP}sheetData")
    if sheet_data is None:
        return []

    all_rows = list(sheet_data.findall(f"{_NSP}row"))
    if not all_rows:
        return []

    # --- Build header index -> field map from row 1 ---
    index_to_field: dict[int, str] = {}
    header_row = all_rows[0]
    for c_el in header_row.findall(f"{_NSP}c"):
        ref = c_el.get("r", "")
        if not ref:
            continue
        ci = _col_index(ref)
        raw_header = _resolve_cell(c_el, shared)
        if raw_header is None:
            continue
        header_str = str(raw_header).strip()
        if not header_str:
            continue
        field = HEADER_TO_FIELD.get(header_str.lower())
        # normalize_header: collapse whitespace + lower (matches HEADER_TO_FIELD keys)
        if field is None:
            norm = re.sub(r"\s+", " ", header_str).strip().lower()
            field = HEADER_TO_FIELD.get(norm)
        if field:
            index_to_field[ci] = field

    # --- Parse data rows ---
    results: list[dict[str, Any]] = []

    for row_el in all_rows[1:]:
        row: dict[str, Any] = {}
        for c_el in row_el.findall(f"{_NSP}c"):
            ref = c_el.get("r", "")
            if not ref:
                continue
            ci = _col_index(ref)
            field = index_to_field.get(ci)
            if field is None:
                continue  # unmapped column — skip
            row[field] = _resolve_cell(c_el, shared)

        # Skip fully-empty rows (all mapped values are None or empty string)
        if not row:
            continue
        mapped_values = list(row.values())
        all_empty = all(
            v is None or (isinstance(v, str) and not v.strip())
            for v in mapped_values
        )
        if all_empty:
            continue

        results.append(row)

    return results
