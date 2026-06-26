"""Format-agnostic Excel parser shared by all report ingestion domains.

Dispatches by workbook **content** (magic bytes / zip parts), not file
extension — a SAP export may arrive with a misleading or odd extension, which is
exactly the bug this module fixes:

  * OOXML  (.xlsx / .xlsm) -> stdlib ``zipfile`` + ``xml.etree`` streaming parser.
    No ``openpyxl``: tolerant of malformed numeric cells like ``"1.057.000"``
    (kept as the raw string instead of raising).
  * BIFF12 (.xlsb)         -> ``pyxlsb`` (imported lazily — only the .xlsb path
    needs it, and ``app.main`` must import without the package present).

Both paths return identical ``[{field_name: raw_value}]`` dicts (raw — callers
apply ``coerce_value`` from their domain ``columns.py``). Columns are identical
across formats; only the container encoding differs. Legacy ``.xls`` (OLE2) and
non-Excel inputs are rejected with a ``ValueError``.

The parser is parameterized by the domain's ``header_to_field`` map and its
``normalize_header`` callable, so the three report domains (credit_report,
jsw_stock, jvml_stock) share one implementation while keeping their column maps
domain-owned. Each domain ``excel.py`` is a thin wrapper over ``parse_workbook``.
"""
from __future__ import annotations

import io
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Callable

HeaderMap = dict[str, str]
Normalizer = Callable[[str], str]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _strip_ns(tag: str) -> str:
    """Strip an XML namespace: ``'{http://...}foo'`` -> ``'foo'``."""
    return tag.rpartition("}")[2] if "}" in tag else tag


def _col_index(ref: str) -> int:
    """Column letter(s) of a cell ref to a 0-based int. ``'A'`` -> 0, ``'AA'`` -> 26."""
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


def _is_empty_row(mapped: dict[str, Any]) -> bool:
    """A row is empty when every mapped value is None or blank string."""
    return all(
        v is None or (isinstance(v, str) and not v.strip())
        for v in mapped.values()
    )


# ---------------------------------------------------------------------------
# OOXML (.xlsx / .xlsm) — stdlib streaming parser
# ---------------------------------------------------------------------------


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    """Parse ``xl/sharedStrings.xml`` into a list indexed by shared-string id.

    Each ``<si>`` may hold multiple ``<t>`` runs (rich text) — join them.
    Returns ``[]`` when the workbook has no shared-strings part (all numeric).
    """
    try:
        xml_bytes = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    shared: list[str] = []
    for si in ET.fromstring(xml_bytes):
        if _strip_ns(si.tag) == "si":
            shared.append(
                "".join(c.text for c in si.iter() if _strip_ns(c.tag) == "t" and c.text)
            )
    return shared


def _first_worksheet(zf: zipfile.ZipFile) -> str:
    """Name of the first ``xl/worksheets/*.xml`` part (SAP uses ``sheet1.xml``)."""
    return next(
        (n for n in zf.namelist()
         if n.startswith("xl/worksheets/") and n.endswith(".xml")),
        "xl/worksheets/sheet1.xml",
    )


def _parse_ooxml(
    data: bytes, header_to_field: HeaderMap, normalize_header: Normalizer
) -> list[dict[str, Any]]:
    """Stream-parse OOXML bytes into ``[{field: raw_value}]``.

    Row 1 builds the column-index -> field map via ``header_to_field``; every
    later non-empty row emits only mapped (known) columns. ``elem.clear()`` keeps
    memory bounded for 17k+ row workbooks.
    """
    zf = zipfile.ZipFile(io.BytesIO(data))
    shared = _read_shared_strings(zf)

    col_map: dict[int, str] = {}
    header_done = False
    rows: list[dict[str, Any]] = []
    cur_row: dict[int, Any] = {}
    cur_type: str | None = None
    cur_ref: str = ""

    with zf.open(_first_worksheet(zf)) as fh:
        for event, elem in ET.iterparse(fh, events=("start", "end")):
            tag = _strip_ns(elem.tag)
            if event == "start":
                if tag == "row":
                    cur_row = {}
                elif tag == "c":
                    cur_type = elem.get("t")       # None => numeric
                    cur_ref = elem.get("r", "")
            else:  # end
                if tag == "v":
                    raw_v = elem.text or ""
                    if cur_type == "s":
                        val: Any = shared[int(raw_v)]
                    elif cur_type in ("str", "b"):
                        val = raw_v
                    else:
                        try:
                            val = float(raw_v)
                        except (ValueError, TypeError):
                            val = raw_v   # malformed numeric cell — keep verbatim
                    if cur_ref:
                        cur_row[_col_index(cur_ref)] = val
                elif tag == "t" and cur_type == "inlineStr":
                    if cur_ref:
                        ci = _col_index(cur_ref)
                        cur_row[ci] = str(cur_row.get(ci, "")) + (elem.text or "")
                elif tag == "row":
                    if not header_done:
                        for ci, v in cur_row.items():
                            field = header_to_field.get(normalize_header(str(v)))
                            if field:
                                col_map[ci] = field
                        header_done = True
                    else:
                        mapped = {
                            col_map[ci]: v for ci, v in cur_row.items() if ci in col_map
                        }
                        if mapped and not _is_empty_row(mapped):
                            rows.append(mapped)
                    cur_row = {}
                elem.clear()
    return rows


# ---------------------------------------------------------------------------
# BIFF12 (.xlsb) — pyxlsb
# ---------------------------------------------------------------------------


def _parse_xlsb(
    data: bytes, header_to_field: HeaderMap, normalize_header: Normalizer
) -> list[dict[str, Any]]:
    """Parse ``.xlsb`` bytes via pyxlsb. First sheet; row 0 = headers."""
    from pyxlsb import open_workbook  # lazy: only the .xlsb path needs pyxlsb

    rows: list[dict[str, Any]] = []
    col_map: dict[int, str] = {}
    with open_workbook(io.BytesIO(data)) as wb:
        with wb.get_sheet(1) as sheet:   # pyxlsb sheets are 1-indexed
            for r_i, row in enumerate(sheet.rows()):
                cells = {c.c: c.v for c in row}   # c.c = 0-based col, c.v = value
                if r_i == 0:
                    for ci, v in cells.items():
                        if v is None:
                            continue
                        field = header_to_field.get(normalize_header(str(v)))
                        if field:
                            col_map[ci] = field
                    continue
                mapped = {col_map[ci]: v for ci, v in cells.items() if ci in col_map}
                if mapped and not _is_empty_row(mapped):
                    rows.append(mapped)
    return rows


# ---------------------------------------------------------------------------
# Public dispatcher
# ---------------------------------------------------------------------------


def parse_workbook(
    data: bytes,
    header_to_field: HeaderMap,
    normalize_header: Normalizer,
) -> list[dict[str, Any]]:
    """Detect the workbook container by content and parse -> ``[{field: raw}]``.

    Raises ``ValueError`` for legacy ``.xls`` (OLE2) and any non-Excel input.
    """
    if not data:
        return []
    if zipfile.is_zipfile(io.BytesIO(data)):
        names = zipfile.ZipFile(io.BytesIO(data)).namelist()
        if any(n.startswith("xl/worksheets/") and n.endswith(".xml") for n in names):
            return _parse_ooxml(data, header_to_field, normalize_header)
        if any(n.startswith("xl/worksheets/") and n.endswith(".bin") for n in names):
            return _parse_xlsb(data, header_to_field, normalize_header)
        raise ValueError(
            "Unrecognized zip workbook: no xl/worksheets/*.xml or *.bin part"
        )
    raise ValueError(
        "Unsupported workbook format (legacy .xls / non-Excel is not supported)"
    )
