<!-- dox:child v1 -->
# `backend/app/services/shared/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Shared domain services that do not fit a single domain folder, e.g. cross-cutting
ingestion cleanup helpers used by multiple import pipelines.

## Local conventions

- Keep files stateless and dependency-light; prefer composition over shared globals.
- Imports from sibling domain packages are allowed when the helper is genuinely
cross-cutting; otherwise create a domain-specific service.

## Key files

| File | Role |
|------|------|
| `ingest_cleanup.py` | Cross-cutting cleanup helpers for ingestion pipelines. |
| `stock_export.py` | Shared JSW/JVML stock export engine: `fetch_stock_docs`, `write_stock_sheet`, `export_stock`, `stock_subtitle`. The `jsw_stock`/`jvml_stock` `export.py` modules are thin shims over this. Builds premium sheets via `utils/shared/excel_premium.py` (banner rows 1-2, column header on **row 3**). |

## Gotchas / fragile spots

- Adding too much here turns the folder into a dumping ground; consider a new
domain folder once a helper has a clear owner.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../CODEX.md`](../../../CODEX.md)
