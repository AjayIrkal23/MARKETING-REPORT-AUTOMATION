<!-- dox:child v1 -->
# `backend/app/services/jsw_stock/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

JSW Stock ingestion, listing, options, config and status services.

## Local conventions

- `ingest.py` is the only writer for the `jsw_stock` collection. It deletes all
  rows for the target `report_date` before inserting, then runs a defensive
  duplicate-cleanup pass.
- `poller.py` re-ingests on **EVERY in-window poll tick** — the old
  `status == "ingested"` skip-once guard is gone. Each tick is a snapshot refresh
  (delete-then-insert), so new party codes / items get picked up hourly and
  duplicates are impossible. `ingestion.last_run_at` is stamped every tick
  (naive-local clock, BE-14) and surfaced on the dashboard + settings status.
- Use the shared `services.shared.ingest_cleanup._row_hash` helper; do not invent
  a domain-specific hashing scheme.

## Key files

| File | Role |
|------|------|
| `ingest.py` | Parse `ZSD_CURRSTK_HR.xlsx`, map party codes, bulk insert, dedupe |
| `poller.py` | Hourly poll (snapshot re-ingest, no skip-once guard) + missing-file alert; stamps `last_run_at` every tick |
| `customer_map.py` | Batch `CustomerCode` lookup at ingest time |
| `list.py` / `options.py` / `query.py` | Server-driven list + filter options |
| `config_service.py` / `status.py` | Admin config singleton + ingestion status |
| `export.py` | **Thin shim** over `services/shared/stock_export.py` (the old byte-for-byte duplication is gone). Defines the `(header, field, kind)` column triples and exposes `fetch_jsw_stock_docs` / `write_jsw_stock_sheet` (used by the combined report export) plus the standalone `export_*` entry. Premium sheet: title banner rows 1-2, column header on **row 3** (was row 1). |

## Gotchas / fragile spots

- `row_hash` is stored on every document for same-date duplicate cleanup. It is
  computed from the coerced source fields only (no metadata).
- `cleanup_duplicates` is called automatically after every ingest; the admin
  endpoint `POST /admin/jsw-stock/cleanup-duplicates` is available for manual
  repair.
- The tzinfo strip for datetimes now lives in `utils/shared/excel_premium._record_cell`
  (shared by all premium exports), **not** in this domain `export.py`. Mongo returns
  tz-aware values (`tz_aware=True`) and openpyxl rejects them on `wb.save`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions
