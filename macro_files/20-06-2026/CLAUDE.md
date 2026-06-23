<!-- dox:child v1 -->
# `macro_files/20-06-2026/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Date-stamped archive of the raw SAP Excel source reports ingested by the
marketing report automation pipeline.

## Local conventions

- Directory name is the ingestion date (`DD-MM-YYYY`).
- Files mirror the current macro source set in `../macro_files/` at the time of
archive.

## Key files

| File | Role |
|------|------|
| `COIL STK.xlsx` | Coil stock snapshot archive. |
| `credit report.XLSX` | Credit report snapshot archive. |
| `JVML Stock (99).xlsx` | JVML stock snapshot archive. |
| `ZSD_CURRSTK_HR.xlsx` | Current stock / party code snapshot archive. |

## Gotchas / fragile spots

- These are immutable archives; do not edit them after ingestion.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../macro_docs/README.md`](../../macro_docs/README.md)
