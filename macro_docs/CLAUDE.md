<!-- dox:child v1 -->
# `macro_docs/` — Domain data dictionaries

Agent-readable data dictionaries for the three SAP Excel exports ingested by the
backend. These docs are the source of truth for column semantics, join keys, and
data-quality traps.

## What lives here

| File | Covers |
|------|--------|
| `README.md` | Request-routing table: "when the user asks about X, use file Y" |
| `credit-report.md` | `credit report.XLSX` — 33 columns, JV0H/VJ0H control areas |
| `west-central-customer-codes.md` | `west  central customer codes.xlsx` — customer master |
| `zsd-currstk-hr.md` | `ZSD_CURRSTK_HR.xlsx` — 72-column current stock / coil data |

## Local conventions

- Update these docs when a source column changes meaning, a new data-quality issue
  is discovered, or the join logic changes.
- Link from backend/frontend code docs instead of restating column definitions.
- Keep the request-routing table in `README.md` current as new domain questions arise.

## Key gotchas (summary)

- `ZSD_CURRSTK_HR.xlsx` contains a malformed numeric cell (`"1.057.000"`); openpyxl
  crashes — use the raw-zip parser.
- Customer-codes filename has **two spaces**: `west  central customer codes.xlsx`.
- SAP customer code is the join key; in ZSD the `Party Code` column is zero-padded
  to 10 digits — strip leading zeros.
- Codes `8451–8499` / `8001`-style are internal JSW yards, not external customers.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none (files only)
- Sibling data: [`../macro_files/CLAUDE.md`](../macro_files/CLAUDE.md)
