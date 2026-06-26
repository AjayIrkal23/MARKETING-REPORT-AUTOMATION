<!-- dox:child v1 -->
# `backend/app/services/credit_report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

Credit Report ingestion, listing, options, config and status services. Credit
ingestion is region-zone aware: active `Region` records drive folders under
`<base>/<dd-mm-yyyy>/CREDITREPORT/<Region>/`.

## Local conventions

- `ingest.py` is the only writer for the `credit_report` collection. Flat mode
  deletes a whole date; region mode deletes only `{report_date, region_id}`.
- Use the shared `services.shared.ingest_cleanup._row_hash` helper; do not invent
  a domain-specific hashing scheme.
- Stored `CreditReport.region_id` is ingest provenance only. The user-facing
  list region filter still joins `customer` to `CustomerCode.region_id`.

## Key files

| File | Role |
|------|------|
| `ingest.py` | Parse `credit report.XLSX`, filter to JV0H/VJ0H, bulk insert, dedupe |
| `poller.py` | Scheduled/manual poll entrypoints |
| `zone_polling.py` | Active-region folder loop, zone status roll-up, missing-zone alerts |
| `list.py` / `options.py` / `serialize.py` | Server-driven list, filter options, and response serialization |
| `config_service.py` / `status.py` | Admin config singleton + ingestion status |
| `export.py` | **Premium** single-sheet `.xlsx` export (curated view): title banner + column header on **row 3** + zebra rows + INR / credit-balance number formats. Exposes `fetch_credit_report_docs` + `write_credit_report_sheet(wb, ...)` (the latter used by the combined report export) plus the standalone export entry. Built on `utils/shared/excel_premium.write_records_sheet`. |

## Gotchas / fragile spots

- `row_hash` is stored on every document for same-date duplicate cleanup. In
  region mode it must include `region_id` so identical rows in different zones
  stay distinct.
- Manual single-zone runs (`run_poll_zone`) bypass the time window and do not
  send missing-file email. Scheduled/run-all polls send one consolidated alert.
- `cleanup_duplicates` is called automatically after every ingest; the admin
  endpoint `POST /admin/credit-report/cleanup-duplicates` is available for manual
  repair.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions
