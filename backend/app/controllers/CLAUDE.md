<!-- dox:child v1 -->
# `backend/app/controllers/` — FastAPI controllers

Thin transport adapters: validate input, call the right service, and return the
standard envelope (or a raw StreamingResponse for exports/templates).

## What lives here

One controller module per domain. Each file holds async endpoint functions that
receive validated DTOs via `Depends`, enforce unknown-query-key rejection, gate
access with `get_current_user` / `get_current_admin`, delegate all business logic
to `services/`, and wrap results with `success()`. No DB access or business rules
live here.

## Local conventions

- One controller function per endpoint; keep controllers free of business logic.
- Reject unknown query keys with `ValidationError` before calling services.
- Auth gating is explicit: `get_current_user` for user-facing routes,
  `get_current_admin` for `/admin/*` routes.
- `GET /.../export` and `GET /.../template` return `StreamingResponse` — no JSON
  envelope and no `response_model` on the route.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Package docstring; empty otherwise. |
| `admin_user.py` | Admin user CRUD, enable/disable, reset-password endpoints. |
| `audit_log.py` | Audit-log list, detail, options, and facet endpoints. |
| `auth.py` | Login, logout, account-status, OTP setup, session cookie set/clear. |
| `coil_price.py` | Coil price admin CRUD endpoints. |
| `credit_report.py` | Credit report list/options/export for authenticated users. |
| `credit_report_config.py` | Credit report scheduler config, status, run-all, run-zone, cleanup. |
| `customer_code.py` | Customer code CRUD, import, template, export endpoints. |
| `dashboard.py` | Today's ingestion status summary endpoint. |
| `jsw_stock.py` / `jvml_stock.py` | Stock list/options/export endpoints. |
| `jsw_stock_config.py` / `jvml_stock_config.py` | Stock scheduler config/status/run-now. |
| `meta.py` | Root, health, ping, and WebSocket ping endpoints. |
| `region.py` | Region admin CRUD and options endpoints. |
| `report.py` | RAKE pivot report generate + rake-drilldown + the single combined `export_combined_controller` (`GET /report/export-combined`, sheet picker). The old `export_report_controller` + `export_rake_totals_controller` were removed. |
| `user.py` | Authenticated user list endpoint. |

## Gotchas / fragile spots

- Cookie set/clear lives only in `auth.py` — services never touch transport.
- Unknown-key whitelists must stay in sync with the domain's query schema fields.
- Streaming routes must omit `response_model` so FastAPI does not try to
  serialize the binary body.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/ARCHITECTURE.md`](../../backend_docs/ARCHITECTURE.md)
