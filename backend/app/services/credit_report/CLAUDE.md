<!-- dox:child v1 -->
# `backend/app/services/credit_report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Credit Report ingestion, listing, options, config and status services.

## Local conventions

- `ingest.py` is the only writer for the `credit_report` collection. It deletes
  all rows for the target `report_date` before inserting, then runs a defensive
  duplicate-cleanup pass.
- Use the shared `services.shared.ingest_cleanup._row_hash` helper; do not invent
  a domain-specific hashing scheme.

## Key files

| File | Role |
|------|------|
| `ingest.py` | Parse `credit report.XLSX`, filter to JV0H/VJ0H, bulk insert, dedupe |
| `poller.py` | Scheduled daily poll + missing-file alert |
| `list.py` / `options.py` / `query.py` | Server-driven list + filter options |
| `config_service.py` / `status.py` | Admin config singleton + ingestion status |

## Gotchas / fragile spots

- `row_hash` is stored on every document for same-date duplicate cleanup. It is
  computed from the coerced source fields only (no metadata).
- `cleanup_duplicates` is called automatically after every ingest; the admin
  endpoint `POST /admin/credit-report/cleanup-duplicates` is available for manual
  repair.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions
