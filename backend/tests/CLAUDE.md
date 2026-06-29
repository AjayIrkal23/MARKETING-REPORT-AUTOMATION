<!-- dox:child v1 -->
# `backend/tests/` — Backend test suite

pytest-based tests for the FastAPI backend.

## What lives here

A mix of pure-function unit tests (no DB) and TestClient-based tests. Some tests
use fake stand-in objects; others rely on a running MongoDB instance and the
project `.env`.

## Local conventions

- Run from `backend/` with the venv active: `pytest` (uses `pytest.ini`).
- Pure-function tests live next to integration-style tests; no separate folder.
- Tests that need the app lifespan/MongoDB must be run with a real DB; DB-free
  tests explicitly avoid `TestClient` context managers or Mongo calls.

## Key files

| File | Role |
|------|------|
| `test_meta_api.py` | Meta endpoints, envelope shape, security headers, auth gating. |
| `test_security.py` | bcrypt hashing/verification. |
| `test_otp.py` | OTP generation, hashing, and verification. |
| `test_ratelimit.py` | Sliding-window login rate limiter. |
| `test_user_query.py` | User list filter/sort helpers and schema validation. |
| `test_admin_user_query.py` | Admin user filter/sort helpers. |
| `test_admin_auth_gating.py` | Admin-only route authorization. |
| `test_credit_report_coerce.py` | Credit-report date coercion edge cases. |
| `test_credit_report_export.py` | Credit-report export behavior. |
| `test_credit_report_filters.py` | Credit-report list filters. |
| `test_credit_report_zone_ingestion.py` | Region-zone ingest helpers and scoped delete behavior. |
| `test_jsw_stock_poller_rerun.py` | Hourly re-ingest: poll re-runs `ingest_file` on an already-`"ingested"` date (skip-guard removed) + stamps `last_run_at`. DB-free `monkeypatch` + `asyncio.run`. |
| `test_customer_code_template.py` | Customer-code import template. |
| `test_ingest_cleanup.py` | Duplicate-row cleanup helper. |
| `test_jsw_stock_export.py` / `test_jvml_stock_export.py` | Stock export behavior (header read from **row 3**; `CustomerCode` patched at `app.services.shared.stock_export`). |
| `test_stock_filters.py` | JSW/JVML ingestion row gates. |
| `test_report_aging.py` / `test_report_enrichment.py` | RAKE report aging + enrichment logic. |
| `test_report_export.py` | Combined export pivot sheet ("BRANCH WISE PIVOT REPORT" via `export_combined`). |
| `test_report_export_combined.py` | The combined multi-sheet workbook (`export_combined` sheet set + metadata + browser-only RAKE/transport-mode exclusions). |
| `test_report_export_route.py` | DB-free TestClient binding test for `GET\|POST /report/export-combined` (GET → `body=None`; POST parses the exclusions body). |
| `test_setup_schemas.py` | Setup/schema validation. |

## Gotchas / fragile spots

- MongoDB-dependent tests require a local MongoDB and a valid `.env`.
- `TestClient` tests that skip the lifespan do not initialize Beanie; use them
  only for endpoints that fail before DB access.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/README.md`](../../backend_docs/README.md)
