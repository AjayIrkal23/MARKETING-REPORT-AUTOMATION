# BE: Excel Parser — Implementation Note
# `app/utils/jsw_stock/excel.py` + `app/utils/jsw_stock/columns.py`

**Status: VERIFIED** — prototype ran against the real file; 17 324 data rows, no exception.

---

## Critical findings from live prototype run

### What the file actually contains

```
xl/worksheets/sheet1.xml   ← confirmed sheet name (no xl/worksheets/sheet2.xml)
xl/sharedStrings.xml       ← 38 462 shared strings
```

Row 1 = header row. Data rows 2–17 325 → **17 324 data rows** (matches SPEC gate).

### The malformed cell — SPEC says "Width (mm)", reality is column BL

The SPEC and `macro_docs/zsd-currstk-hr.md` both say `"Width (mm)"` contains the invalid
value. **This is wrong.** Width (mm) is column M (0-based index 12) and is stored entirely
as shared strings — no malformed cells. The actual malformed cells are in column **BL**
(0-based index 63 = `Tensile Strength MPa (B)`, type `number`), at data rows 578 and 13 571,
plus 10 other rows that contain similar two-dot numeric strings (`"1.057.000"`, `"1.018.000"`).

```
BL578:   <c r="BL578" s="6"><v>1.057.000</v></c>  ← no t attr → treated as numeric → float() fails
BL13571: <c r="BL13571" s="6"><v>1.057.000</v></c>
```

The raw-zip parser returns `"1.057.000"` as a `str` (malformed-cell guard). Because
`tensile_strength_mpa_b` is a `number`-typed column, `coerce_value` then returns `None`.
This is correct — the builder does NOT need to preserve this string for any field.

### Cell encoding summary

| Encoding | `t` attr | Resolve via |
|---|---|---|
| Shared string | `t="s"` | `shared_strings[int(v_text)]` |
| Inline string | `t="inlineStr"` | `<is><t>` child text |
| Formula result (str) | `t="str"` | `<v>` text directly |
| Bool | `t="b"` | `<v>` text (`"0"`/`"1"`) |
| Numeric (default) | no `t` attr | `float(v_text)` or raw str on failure |

**Production dates** (col Z, index 25): stored as plain numeric serials (no `t` attr, no style
hinting); `float(v_text)` succeeds and returns e.g. `42891.0`. Decode with `EPOCH + timedelta(days=v)`.

**Width (mm)** (col M, index 12): all 17 324 values are shared strings — `type=str` always.

**CP End Date** (col BQ, index 68): also numeric serials (same as production date). `type=float`.

### Namespace stripping

The sheet XML has no namespace in the default case for this file. However the shared strings XML
does. Safe universal approach: `tag.rpartition("}")[2]` strips any namespace prefix and works for
both namespaced and bare tags.

---

## `app/utils/jsw_stock/columns.py` — complete skeleton

```python
"""Column definitions and coercion for the ZSD_CURRSTK_HR domain.

Single source of truth for all 72 columns + coerce_value.
No logic outside this file should hard-code column names or type rules.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Column catalogue  (excel_header, field_name, type_tag)
# type_tag: "text" | "number" | "date"
# ---------------------------------------------------------------------------

COLUMNS: list[tuple[str, str, str]] = [
    ("SO Sales Org",              "so_sales_org",              "text"),
    ("Sales Order Type",          "sales_order_type",          "text"),
    ("Distr.Chnl",                "distr_chnl",                "text"),
    ("Sold To Party",             "sold_to_party",             "text"),
    ("Party Code",                "party_code",                "text"),
    ("Ship To Party",             "ship_to_party",             "text"),
    ("Customer",                  "customer",                  "text"),
    ("Material",                  "material",                  "text"),
    ("Sales Office",              "sales_office",              "text"),
    ("SO-Product Form",           "so_product_form",           "text"),
    ("JSW Grade",                 "jsw_grade",                 "text"),
    ("Act.Thickness (mm)",        "act_thickness_mm",          "text"),
    ("Width (mm)",                "width_mm",                  "text"),
    ("Batch",                     "batch",                     "text"),
    ("Unrestr.Qty.",              "unrestr_qty",               "number"),
    ("In Quality Insp.",          "in_quality_insp",           "number"),
    ("Blocked",                   "blocked",                   "number"),
    ("Stock Quantity",            "stock_quantity",            "number"),
    ("Usage Decision",            "usage_decision",            "text"),
    ("NCO Declared",              "nco_declared",              "text"),
    ("Next Workcenter",           "next_workcenter",           "text"),
    ("Length(mm)",                "length_mm",                 "text"),
    ("NCO Reason",                "nco_reason",                "text"),
    ("UD Remarks",                "ud_remarks",                "text"),
    ("Aging",                     "aging",                     "number"),
    ("Production Date",           "production_date",           "date"),
    ("Shift",                     "shift",                     "text"),
    ("Sales Order No",            "sales_order_no",            "text"),
    ("SO Item Num",               "so_item_num",               "text"),
    ("Order Status",              "order_status",              "text"),
    ("Location",                  "location",                  "text"),
    ("STR No",                    "str_no",                    "text"),
    ("STO No",                    "sto_no",                    "text"),
    ("DO No",                     "do_no",                     "text"),
    ("Shipment",                  "shipment",                  "text"),
    ("Storage Location",          "storage_location",          "text"),
    ("Port Name",                 "port_name",                 "text"),
    ("UNLOADING POINT",           "unloading_point",           "text"),
    ("RECIEVING POINT",           "recieving_point",           "text"),
    ("Purchase Order Number",     "purchase_order_number",     "text"),
    ("Scheduled Status",          "scheduled_status",          "text"),
    ("Eq. Specification",         "eq_specification",          "text"),
    ("Eq. Sub Grade",             "eq_sub_grade",              "text"),
    ("SO-End Application",        "so_end_application",        "text"),
    ("production workcenter",     "production_workcenter",     "text"),
    ("YS in MPa",                 "ys_in_mpa",                 "number"),
    ("ELONGATION",                "elongation",                "text"),
    ("Elongation(Mic)",           "elongation_mic",            "number"),
    ("HARDNESS",                  "hardness",                  "text"),
    ("S_ALUMINIUM_PCT",           "s_aluminium_pct",           "number"),
    ("S_BORON_PCT",               "s_boron_pct",               "number"),
    ("S_CARBON_PCT",              "s_carbon_pct",              "number"),
    ("S_CHROMIUM_PCT",            "s_chromium_pct",            "number"),
    ("S_COPPER_PCT",              "s_copper_pct",              "number"),
    ("S_MANGANESE_PCT",           "s_manganese_pct",           "number"),
    ("S_MOLYBDENUM_PCT",          "s_molybdenum_pct",          "number"),
    ("S_NICKEL_PCT",              "s_nickel_pct",              "number"),
    ("S_NIOBIUM_PCT",             "s_niobium_pct",             "number"),
    ("S_PHOSPHORUS_PCT",          "s_phosphorus_pct",          "number"),
    ("S_SILICON_PCT",             "s_silicon_pct",             "number"),
    ("S_SULPHUR_PCT",             "s_sulphur_pct",             "number"),
    ("S_TITANIUM_PCT",            "s_titanium_pct",            "number"),
    ("S_VANADIUM_PCT",            "s_vanadium_pct",            "number"),
    ("Tensile Strength MPa (B)",  "tensile_strength_mpa_b",    "number"),
    ("YIELD STRENGTH",            "yield_strength",            "text"),
    ("UTS",                       "uts",                       "text"),
    ("Special Stock",             "special_stock",             "text"),
    ("CP Number",                 "cp_number",                 "text"),
    ("CP End Date",               "cp_end_date",               "date"),
    ("LC Exp Date",               "lc_exp_date",               "text"),
    ("Route",                     "route",                     "text"),
    ("Route Desc",                "route_desc",                "text"),
]

# ---------------------------------------------------------------------------
# Derived lookup tables (computed once at import)
# ---------------------------------------------------------------------------

def normalize_header(h: object) -> str:
    """Collapse whitespace, strip, lowercase.  'Act.Thickness (mm)' → 'act.thickness (mm)'."""
    return re.sub(r"\s+", " ", str(h)).strip().lower()


# Keyed by *normalized* header string → safe dict (72 entries, all unique after normalize).
HEADER_TO_FIELD: dict[str, str] = {
    normalize_header(excel_h): field
    for excel_h, field, _ in COLUMNS
}

FIELD_TYPES: dict[str, str] = {field: typ for _, field, typ in COLUMNS}

TEXT_FIELDS:   tuple[str, ...] = tuple(f for _, f, t in COLUMNS if t == "text")
NUMBER_FIELDS: tuple[str, ...] = tuple(f for _, f, t in COLUMNS if t == "number")
DATE_FIELDS:   tuple[str, ...] = tuple(f for _, f, t in COLUMNS if t == "date")

# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

_EPOCH = datetime(1899, 12, 30)


def excel_serial_to_datetime(serial: float) -> datetime:
    """Convert Excel serial date to datetime.  Epoch is 1899-12-30 (Excel bug included)."""
    return _EPOCH + timedelta(days=serial)


# ---------------------------------------------------------------------------
# Coerce raw parser value → typed Python value
# ---------------------------------------------------------------------------

def coerce_value(field: str, raw: object) -> str | float | datetime | None:
    """Apply the type rule for *field* to a raw parse-time value.

    *raw* is whatever parse_workbook returned: str (shared string or
    malformed-numeric fallback), float (numeric cell), or None.

    Rules by type_tag:
      text   — None→None; float with no fraction→str(int(v)); other float→str(v);
               str→strip or None.  Non-floatable strings (e.g. "1.057.000" in a text
               column) are kept as-is after stripping.
      number — float(raw) if parseable, else None.
      date   — int/float → excel_serial_to_datetime; str → try "%d.%m.%Y" then
               fromisoformat (strip trailing Z); else None.
    """
    typ = FIELD_TYPES.get(field, "text")
    if raw is None:
        return None

    if typ == "text":
        if isinstance(raw, float):
            return str(int(raw)) if raw.is_integer() else str(raw)
        s = str(raw).strip()
        return s if s else None

    if typ == "number":
        if isinstance(raw, float):
            return raw
        try:
            return float(raw)
        except (ValueError, TypeError):
            return None

    if typ == "date":
        if isinstance(raw, (int, float)):
            try:
                return excel_serial_to_datetime(float(raw))
            except (ValueError, OverflowError):
                return None
        if isinstance(raw, str):
            s = raw.strip()
            if not s:
                return None
            for fmt in ("%d.%m.%Y",):
                try:
                    return datetime.strptime(s, fmt)
                except ValueError:
                    pass
            try:
                return datetime.fromisoformat(s.rstrip("Z"))
            except ValueError:
                return None
        return None

    return None  # unreachable
```

**Line estimate: ~155 lines — well under 250.**

---

## `app/utils/jsw_stock/excel.py` — complete working implementation

This is the validated reference implementation. Every detail below is confirmed against
the real file.

```python
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
    letters = re.match(r"([A-Za-z]+)", ref).group(1).upper()  # type: ignore[union-attr]
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
      t="s"        → shared_strings[int(<v> text)]
      t="inlineStr" → concatenated <is><t> children
      t="str"/"b"  → <v> text verbatim
      (no t attr)  → float(<v> text) or raw string on ValueError (malformed-cell guard)
    """
    zf = zipfile.ZipFile(io.BytesIO(data))
    shared = _read_shared_strings(zf)

    # State for iterparse
    col_map: dict[int, str] = {}        # col_index → field_name (built from header row)
    header_done = False
    rows: list[dict[str, object]] = []

    cur_row: dict[int, object] = {}
    cur_row_num: int = 0
    cur_type: str | None = None         # value of <c t="…">
    cur_ref: str = ""                   # value of <c r="…">

    with zf.open("xl/worksheets/sheet1.xml") as fh:
        for event, elem in ET.iterparse(fh, events=("start", "end")):
            tag = _strip_ns(elem.tag)

            if event == "start":
                if tag == "row":
                    cur_row_num = int(elem.get("r", 0))
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
                    # <is><t> rich-text inline string
                    if cur_ref:
                        ci = _col_index(cur_ref)
                        cur_row[ci] = str(cur_row.get(ci, "")) + (elem.text or "")

                elif tag == "row":
                    if not header_done:
                        # Build col_index → field_name map from row 1 headers.
                        for ci, v in cur_row.items():
                            field = HEADER_TO_FIELD.get(normalize_header(v))
                            if field:
                                col_map[ci] = field
                        header_done = True
                    else:
                        # Map known columns only; skip fully-empty rows.
                        mapped = {
                            col_map[ci]: v
                            for ci, v in cur_row.items()
                            if ci in col_map
                        }
                        if any(v is not None and v != "" for v in mapped.values()):
                            rows.append(mapped)
                    cur_row = {}

                elem.clear()    # free memory — critical for 17k+ row files

    return rows
```

**Line estimate: ~120 lines — well under 250.**

---

## Usage in `services/jsw_stock/ingest.py`

```python
from ...utils.jsw_stock.excel import parse_workbook
from ...utils.jsw_stock.columns import coerce_value, FIELD_TYPES

raw_rows = parse_workbook(file_bytes)          # list[dict[str, str|float|None]]

for raw in raw_rows:
    doc_fields: dict[str, object] = {}
    for field, raw_val in raw.items():
        doc_fields[field] = coerce_value(field, raw_val)
    # then attach party_code_normalized, customer_name, etc.
```

---

## Key design decisions

### 1. Why NOT openpyxl

`openpyxl.load_workbook()` raises `ValueError: could not convert string to float`
on any numeric cell whose `<v>` text is not float-parseable (e.g. `"1.057.000"`).
This happens in **both** normal and `read_only=True` mode. The raw-zip approach
bypasses openpyxl's XML parser entirely.

### 2. iterparse vs full-tree parse

The sheet XML is ~35 MB. `ET.iterparse` + `elem.clear()` keeps memory at ~50 MB;
full-tree parse would require ~350 MB. Always use iterparse for the sheet; the
shared strings file (~5 MB) is small enough to parse as a full tree.

### 3. Shared strings are THE primary string storage

All text columns (Sold To Party, Width (mm), JSW Grade, etc.) are stored as shared
string indices (`t="s"`). Width (mm) is entirely shared strings — its values come out
as Python `str` objects via the shared string lookup. No special-casing needed.

### 4. Numeric serials for date columns

Production Date (col Z, index 25) and CP End Date (col BQ, index 68) both store
Excel serial integers as plain numeric cells (no `t` attr). The parser returns
`float`. `coerce_value` then calls `excel_serial_to_datetime(v)` via
`EPOCH + timedelta(days=v)` where `EPOCH = datetime(1899, 12, 30)`.

### 5. HEADER_TO_FIELD key format

All 72 normalized headers are unique after `re.sub(r"\s+", " ").strip().lower()`.
Verified: no collisions. The `normalize_header` in columns.py matches the
`normalize_header` in excel.py — they must be imported from the same module.

### 6. `elem.clear()` placement

Must be called at the `"end"` handler for every element, including `<row>`, `<c>`,
`<v>`. This is what keeps iterparse O(n) in memory rather than building the full
DOM.

---

## SPEC corrections / clarifications for the builder

1. **"1.057.000" is in `tensile_strength_mpa_b` (col BL), NOT `width_mm` (col M).**
   The SPEC verification gate says "the `1.057.000` cell stays a string" — that is
   what `parse_workbook` returns from the raw-zip parser. However `coerce_value` for
   a `number` field returns `None` for non-parseable strings. The gate should be
   interpreted as: the raw parser does not raise, and the raw dict contains `"1.057.000"`
   as a str; after coercion it becomes `None` in the stored document. Both behaviors
   are correct. Width (mm) is unaffected.

2. **`columns.py` will be ~155 lines**, not near 250. No split needed.

3. **`excel.py` exports only `parse_workbook`** (single public function). Callers
   import it as `from ...utils.jsw_stock.excel import parse_workbook`.

4. **No `MAX_IMPORT_ROWS` guard needed here** — this parser is called by the
   scheduler on a known file, not a user upload. DoS guard belongs in the config
   layer if needed.

5. **Empty-row detection**: `if any(v is not None and v != "" ...)`. The sheet has
   zero fully-empty data rows (verified), so this guard costs nothing in practice
   but is required for correctness with future files.

6. **`inlineStr` cells**: present in some SAP exports for formula-derived text.
   The `t="inlineStr"` branch handles them by concatenating all `<is><t>` child
   texts. Not observed in this particular file but must be supported.

---

## Verification gate (run before declaring the parser done)

```bash
cd /DATA/CODE_FILES/MARKETING\ REPORT\ AUTOMATION
backend/.venv/bin/python -c "
from backend.app.utils.jsw_stock.excel import parse_workbook
rows = parse_workbook(open('macro_files/ZSD_CURRSTK_HR.xlsx', 'rb').read())
assert len(rows) == 17324, f'Expected 17324, got {len(rows)}'
# Find the malformed cell (field tensile_strength_mpa_b, raw value)
mal = [r for r in rows if r.get('tensile_strength_mpa_b') == '1.057.000']
assert len(mal) >= 2, f'Expected >=2 malformed cells, got {len(mal)}'
print(f'PASS: {len(rows)} rows, {len(mal)} malformed raw str cells')
"
```

Expected output: `PASS: 17324 rows, 2 malformed raw str cells`
(There are also 10 rows with `"1.018.000"` and similar — all handled identically.)
