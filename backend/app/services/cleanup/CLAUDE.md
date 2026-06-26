<!-- dox:child v1 -->
# `backend/app/services/cleanup/` — Stale ingestion-folder cleanup

Daily job that deletes whole `<base_path>/<dd-mm-yyyy>` ingestion folders older
than a retention window. **Files only — DB ingestion records are never touched.**

## What lives here

The cleanup *policy* singleton (`CleanupConfig`, key `"default"`) holds only the
retention window + daily run hour. The folders it cleans are the **distinct
`base_path`s of the three ingestion configs** (JSW / JVML / Credit Report) — this
domain stores no path/file fields of its own.

## Local conventions

- `config_service.upsert_config` saves the singleton then calls
  `core.scheduler.apply_cleanup_schedule` via a **local import** (breaks the
  scheduler ↔ service cycle, mirrors `credit_report.config_service`).
- The config-save HTTP mutation is auto-audited by `AuditMiddleware` (category
  `admin`); the cron run is audited by `@audited_job("cron.cleanup")` (category
  `cron`). No bespoke audit category is added.
- `run_cleanup` respects the `enabled` flag (disabled / never-saved = no-op,
  mirroring the stock pollers' `run_poll`) and uses the LOCAL clock for "today"
  to match the pollers' `dd-mm-yyyy` folder names.

## Key files

| File | Role |
|------|------|
| `config_service.py` | `get_config` / `upsert_config` — singleton get + save + reschedule. |
| `runner.py` | `run_cleanup` — gather distinct base paths, purge, record last-run; `_to_public` DTO mapper. |
| `__init__.py` | Public surface (`get_config`, `upsert_config`, `run_cleanup`). |

The actual delete is `utils/shared/cleanup.py::purge_old_date_folders` (pure fs,
never raises; unit-tested in `tests/test_folder_cleanup.py`). The cron wrapper is
`services/cron/cleanup.py`; scheduling lives in `core/scheduler.py`
(`apply_cleanup_schedule`, `CLEANUP_JOB_ID`) + `core/scheduler_stock.py`
(`schedule_cleanup_job`). API: `routes/cleanup.py` → `/admin/cleanup/*`.

## Gotchas / fragile spots

- A folder is deleted only when its name strictly parses as `dd-mm-yyyy` AND
  `(today - folder_date).days > retention_days`. Non-date dirs (e.g.
  `CREDITREPORT`) and loose files are left untouched.
- Deleting `<base_path>/<date>` recurses into the credit-report
  `CREDITREPORT/<zone>/` subtree — one delete clears all zones for that date.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)
