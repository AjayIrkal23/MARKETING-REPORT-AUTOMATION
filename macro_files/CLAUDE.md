<!-- dox:child v1 -->
# `macro_files/` — Source Excel data files

The raw SAP exports that feed the marketing report automation. These are **data
assets**, not code — keep them out of the Python/TypeScript source trees.

## What lives here

| File | Source | Use |
|------|--------|-----|
| `credit report.XLSX` | SAP Credit Management | Credit limits, exposure, overdue, block status |
| `west  central customer codes.xlsx` | Customer master (two spaces in name) | CAM, contact, segment, route/destination mapping |
| `ZSD_CURRSTK_HR.xlsx` | SAP current stock | Coil/batch inventory, chemistry, mechanical props |
| `JVML Stock (99).xlsx` | JVML current stock | Same 72-column structure as ZSD, second mill |
| `COIL STK.xlsx` | Coil stock summary | Reference / legacy input |

## Local conventions

- Do not commit these files to git (they are large and may contain business data).
- The ingestion pollers read from configurable `base_path` + `file_name`; the dev
  fallback is this directory.
- When adding a new source file, document it in [`../macro_docs/CLAUDE.md`](../macro_docs/CLAUDE.md).

## Gotchas / fragile spots

- `ZSD_CURRSTK_HR.xlsx` and `JVML Stock (99).xlsx` cannot be read by `openpyxl`
  because of malformed numeric cells. The backend uses raw-zip XML parsing.
- Filenames must be matched exactly — especially the double space in the customer
  codes file.
- These files are overwritten by daily SAP exports; ingestion is idempotent by
  `report_date`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none (files only)
- Related docs: [`../macro_docs/CLAUDE.md`](../macro_docs/CLAUDE.md)
