"""Raw-zip parser for ZSD_CURRSTK_HR-shaped workbooks.

Does NOT use openpyxl — avoids the ValueError raised by cells like '1.057.000'
that cannot be parsed as float.  Uses only stdlib: zipfile + xml.etree.ElementTree.

Returns raw (uncoerced) field dicts.  Callers apply coerce_value from columns.py.
"""
from __future__ import annotations

import io
import re
import zipfile
import xml.etree.ElementTree as ET

from .columns import HEADER_TO_FIELD, normalize_header

# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


def _strip_ns(tag: str) -> str:
    """Strip XML namespace: '{http://...}foo' → 'foo'."""
    return tag.rpartition("}")[2] if "}" in tag else tag


def _col_index(ref: str) -> int:
    """Column letter(s) from a cell ref to 0-based int.  'A' → 0, 'Z' → 25, 'AA' → 26."""
    m = re.match(r"([A-Za-z]+)", ref)
    if not m:
        return 0
    letters = m.group(1).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    """Parse xl/sharedStrings.xml and return indexed list of strings.

    Each <si> element may have multiple <t> children (rich text) — join them.
    The file is typically small (~5 MB) so we parse the whole tree in memory.
    """
    shared: list[str] = []
    with zf.open("xl/sharedStrings.xml") as fh:
        tree = ET.parse(fh)
        for si in tree.getroot():
            if _strip_ns(si.tag) == "si":
                texts = [
                    c.text
                    for c in si.iter()
                    if _strip_ns(c.tag) == "t" and c.text
                ]
                shared.append("".join(texts))
    return shared


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_workbook(data: bytes) -> list[dict[str, object]]:
    """Parse raw .xlsx bytes → list of field dicts (one per data row).

    Each dict maps field_name → raw value (str | float | None).
    Coercion is NOT applied here — call coerce_value() from columns.py afterward.

    Steps:
      1. Open the bytes as a ZipFile.
      2. Build shared-string list from xl/sharedStrings.xml.
      3. iterparse xl/worksheets/sheet1.xml (confirmed sheet name).
      4. Row 1 = header → build col_index → field mapping via HEADER_TO_FIELD.
      5. For each subsequent row, resolve each cell's raw value and emit a dict
         of only the mapped (known) fields.  Fully-empty rows are skipped.

    Cell value resolution (by <c t="…"> attribute):
      t="s"         → shared_strings[int(<v> text)]
      t="inlineStr" → concatenated <is><t> children
      t="str"/"b"   → <v> text verbatim
      (no t attr)   → float(<v> text) or raw string on ValueError (malformed-cell guard)
    """
    zf = zipfile.ZipFile(io.BytesIO(data))
    shared = _read_shared_strings(zf)

    # State for iterparse
    col_map: dict[int, str] = {}        # col_index → field_name (built from header row)
    header_done = False
    rows: list[dict[str, object]] = []

    cur_row: dict[int, object] = {}
    cur_type: str | None = None         # value of <c t="…">
    cur_ref: str = ""                   # value of <c r="…">

    with zf.open("xl/worksheets/sheet1.xml") as fh:
        for event, elem in ET.iterparse(fh, events=("start", "end")):
            tag = _strip_ns(elem.tag)

            if event == "start":
                if tag == "row":
                    cur_row = {}
                elif tag == "c":
                    cur_type = elem.get("t")          # None means numeric
                    cur_ref = elem.get("r", "")

            else:  # event == "end"
                if tag == "v":
                    raw_v: str = elem.text or ""
                    if cur_type == "s":
                        val: object = shared[int(raw_v)]
                    elif cur_type in ("str", "b"):
                        val = raw_v
                    else:
                        # Numeric cell.  float() fails on "1.057.000" → keep as str.
                        try:
                            val = float(raw_v)
                        except (ValueError, TypeError):
                            val = raw_v
                    if cur_ref:
                        cur_row[_col_index(cur_ref)] = val

                elif tag == "t" and cur_type == "inlineStr":
                    # <is><t> rich-text inline string — concatenate multiple <t> children
                    if cur_ref:
                        ci = _col_index(cur_ref)
                        cur_row[ci] = str(cur_row.get(ci, "")) + (elem.text or "")

                elif tag == "row":
                    if not header_done:
                        # Build col_index → field_name map from row 1 headers.
                        for ci, v in cur_row.items():
                            field = HEADER_TO_FIELD.get(normalize_header(str(v)))
                            if field:
                                col_map[ci] = field
                        header_done = True
                    else:
                        # Map known columns only; skip fully-empty rows.
                        mapped: dict[str, object] = {
                            col_map[ci]: v
                            for ci, v in cur_row.items()
                            if ci in col_map
                        }
                        if any(v is not None and v != "" for v in mapped.values()):
                            rows.append(mapped)
                    cur_row = {}

                elem.clear()    # free memory — critical for 17k+ row files (ADDENDUM B-2)

    return rows
