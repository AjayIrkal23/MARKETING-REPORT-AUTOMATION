# backend/ — Agent Surface Guide

FastAPI service for the JSW Marketing Report Automation dashboard.
Layered architecture (`routes → controllers → services → schemas → models`, with
`core/` for cross-cutting concerns), MongoDB-backed via Beanie. Implements the
**meta** (ping/health), **auth** (login), and **user** (list + admin seed) domains.

> **Every backend change must apply the full backend craft-skill set** (all 27 —
> see `~/.claude/rules/agent-lifecycle-routing.md`). The structure below is the
> realization of those skills; keep it intact and extend by mirroring it.

---

## Stack

| Component | Version |
|---|---|
| Python | 3.13.7 |
| FastAPI | 0.136.3 |
| Starlette | 1.2.0 |
| Pydantic | 2.13.4 |
| Uvicorn (standard: uvloop / httptools / websockets) | 0.48.0 |
| MongoDB driver | pymongo 4.17.0 (`AsyncMongoClient`) |
| ODM | Beanie 2.1.0 (Pydantic v2 documents; Motor retired in 2.x) |
| Password hashing | bcrypt 5.0.0 |
| Email validation | email-validator 2.3.0 (`EmailStr`) |

All deps are fully pinned in `requirements.txt` (matches `pip freeze` exactly).

### MongoDB

- Connection: `MONGODB_URI` (default `mongodb://localhost:27017`), DB `MONGODB_DB`
  (default `marketing_report`). Env vars / live `.env` override (`.env` is gitignored).
- Opened on app startup via the `lifespan` hook in `app/main.py`
  (`core.database.init_db` → `init_beanie`), closed on shutdown (`close_db`). Mongo
  failures at startup are logged but **non-fatal** so ping/health still boot without a DB.
- Seed admin (`app/services/user/seed.py`) runs on startup and standalone via
  `./.venv/bin/python -m app.scripts.seed`. Idempotent — keyed on unique `emailid`.

---

## Setup & Run

```bash
# One-time: create venv and install deps
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Start server (hot-reload)
./run.sh
# OR directly:
./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- `.venv/` is `.gitignore`d — always recreate from `requirements.txt`.

---

## Endpoints

All JSON endpoints return the standard envelope (`{success, data, message, meta}` on
success, `{success:false, error:{code,message,details}}` on error). The `data` column
below is the payload inside that envelope. The WebSocket is exempt (raw text frames).

| Method | Path | `data` | Notes |
|---|---|---|---|
| GET | `/` | `RootData` | Service banner: `service`, `version`, `docs`, `ping` |
| GET | `/health` | `HealthData` | `status`, `version`, `uptime_seconds` (float) |
| GET | `/ping` | `PingData` | `message="pong"`, `seq` (auto-increment), `timestamp` (ISO-8601 UTC) |
| WS | `/ws/ping` | text frame | `"pong"` for `"ping"`, else `"echo:<text>"` |
| POST | `/auth/login` | `AuthUser` | Body `{emailid, password}`; verifies bcrypt hash, stamps `lastlogined`; `401 UNAUTHORIZED` on bad creds (generic message) |
| GET | `/users` | `UserPublic[]` | Backend-driven paginated list; pagination in `meta`. Query: `page,limit,sortBy(emailid\|lastlogined\|isAdmin),sortOrder,q` |
| GET | `/admin/audit-logs` | `AuditLogPublic[]` | **Admin-only.** Backend-driven paginated audit log. Query: `page,limit,sortBy(timestamp\|category\|action\|outcome\|status_code\|actor_email\|duration_ms\|path\|method),sortOrder,q,category,outcome,action,method,actor,status,source,dateFrom,dateTo` |
| GET | `/admin/audit-logs/options` | `AsyncOption[]` | **Admin-only.** Async-select suggestions (distinct actor/path/action) for the search box |
| GET | `/admin/audit-logs/facets` | `AuditFacets` | **Admin-only.** Filter enums: categories, outcomes, sources, distinct methods, statuses, actions |
| GET | `/admin/audit-logs/{log_id}` | `AuditLogDetail` | **Admin-only.** Full entry incl. redacted request/response payloads |
| GET | `/admin/regions` | `RegionPublic[]` | **Admin-only.** Backend-driven paginated region list; pagination in `meta`. Query: `page,limit,sortBy(name\|active\|created_at\|updated_at),sortOrder,q,active` |
| GET | `/admin/regions/options` | `RegionOption[]` | **Admin-only.** Async-select suggestions (region name search) for the toolbar combobox |
| POST | `/admin/regions` | `RegionPublic` | **Admin-only.** Create region `{name, emails[], active}`; `201`; `409 CONFLICT` on duplicate name (case-insensitive); emits audit `region.created` |
| GET | `/admin/regions/{region_id}` | `RegionPublic` | **Admin-only.** Single region; `404 NOT_FOUND` for bad/missing id |
| PATCH | `/admin/regions/{region_id}` | `RegionPublic` | **Admin-only.** Partial update (only changed fields); emits audit `region.updated` |
| DELETE | `/admin/regions/{region_id}` | `null` | **Admin-only.** Delete region; emits audit `region.deleted` |
| GET | `/admin/coil-prices` | `CoilPricePublic[]` | **Admin-only.** Backend-driven paginated coil-price list (Coil Config → Per Coil Price). Query: `page,limit,sortBy(quantity\|price\|active\|created_at\|updated_at),sortOrder,active`. No free-text `q`. |
| POST | `/admin/coil-prices` | `CoilPricePublic` | **Admin-only.** Create `{quantity,price,active}`; `201`; `409 CONFLICT` on duplicate `quantity`; emits audit `coil_price.created` |
| GET | `/admin/coil-prices/{coil_price_id}` | `CoilPricePublic` | **Admin-only.** Single coil price; `404 NOT_FOUND` for bad/missing id |
| PATCH | `/admin/coil-prices/{coil_price_id}` | `CoilPricePublic` | **Admin-only.** Partial update (only changed fields); emits audit `coil_price.updated` |
| DELETE | `/admin/coil-prices/{coil_price_id}` | `null` | **Admin-only.** Delete coil price; emits audit `coil_price.deleted` |
| GET | `/admin/customer-codes` | `CustomerCodePublic[]` | **Admin-only.** Paginated list (each row carries the resolved `region_name`). Query: `page,limit,sortBy(segment\|code\|customer\|destination\|cam\|head\|route\|created_at\|updated_at),sortOrder,q,segment,code,customer,destination,cam,mob,head,route,ship_to,ship_to_customer,region` |
| GET | `/admin/customer-codes/options` | `AsyncOption[]` | **Admin-only.** Distinct values for one `field` (Literal whitelist) matching `q` — powers each per-field async-select filter (search-as-you-type) |
| GET | `/admin/customer-codes/template` | xlsx file | **Admin-only.** Streams the canonical 10-column import template (raw file, **NOT** the JSON envelope) |
| POST | `/admin/customer-codes/import` | `CustomerCodeImportResult` | **Admin-only.** Multipart (`file` xlsx + `region_id` form field, ≤10 MB); parses rows, assigns the chosen region, bulk-inserts; returns `{total_rows,inserted,skipped,errors[],region_id,region_name}`; emits `customer_code.imported` |
| POST | `/admin/customer-codes` | `CustomerCodePublic` | **Admin-only.** Create `{segment,code,customer,destination,region_id,...}`; `201`; emits `customer_code.created` |
| GET | `/admin/customer-codes/{code_id}` | `CustomerCodePublic` | **Admin-only.** Single row; `404 NOT_FOUND` for bad/missing id |
| PATCH | `/admin/customer-codes/{code_id}` | `CustomerCodePublic` | **Admin-only.** Partial update (only changed fields); emits `customer_code.updated` |
| DELETE | `/admin/customer-codes/{code_id}` | `null` | **Admin-only.** Delete; emits `customer_code.deleted` |
| GET | `/jsw-stock` | `JswStockPublic[]` | **Any authenticated user** (`get_current_user`, NOT admin). Paginated current-stock list (each row carries mapped `customer_name`/`customer_code_id`). Query: `page,limit,sortBy,sortOrder` + single `date` (`dd-mm-yyyy`, regex-validated, exact match on `report_date`) + 4 per-field filters (`sales_order_type,customer_name,sales_office,nco_declared`). No free-text `q`; no `dateFrom`/`dateTo` range. Controller `_ALLOWED_LIST_KEYS` = 9 keys total. |
| GET | `/jsw-stock/options` | `AsyncOption[]` | **Any authenticated user.** Distinct values for one `field` (the 4-field `JswStockField` Literal: `sales_order_type,customer_name,sales_office,nco_declared`) matching `q` — powers each per-field async-select filter (type-ahead). |
| GET | `/admin/jsw-stock/config` | `JswStockConfigPublic` | **Admin-only.** The singleton ingestion config (returns defaults if unset). |
| PUT | `/admin/jsw-stock/config` | `JswStockConfigPublic` | **Admin-only.** Upsert config `{enabled,base_path,file_name,start_time,end_time,interval_hours,notify_emails}`; validators reject start≥end / path-traversal `file_name` / interval∉[1,24] / bad HH:MM; (re)schedules the `jsw_stock.poll` job; emits `jsw_stock.config_updated`. |
| GET | `/admin/jsw-stock/status` | `JswStockStatusPublic` | **Admin-only.** Latest + recent-14 `JswStockIngestion` records + `enabled`. |
| POST | `/admin/jsw-stock/run-now` | `JswStockStatusPublic` | **Admin-only.** Trigger an immediate `run_poll()` (manual check). |

### JSW Stock Excel automation (domain `jsw_stock`)

Scheduled SAP `ZSD_CURRSTK_HR.xlsx` ingestion + a non-admin browse list. Mirrors the
`customer_code` layering. Key facts:

- **Models** (collections): `JswStock` (`jsw_stock`) — all **72 ZSD columns** flat (typed via
  `utils/jsw_stock/columns.py`) + `party_code_normalized`/`customer_name`/`customer_code_id`/
  `report_date`/`source_file`/`created_at`; `JswStockConfig` (`jsw_stock_configs`, singleton
  `key="default"`); `JswStockIngestion` (`jsw_stock_ingestions`, unique `report_date`). All three
  registered in `core/database.py` `DOCUMENT_MODELS`.
- **Parser** (`utils/jsw_stock/excel.py`): tolerant **raw-zip** reader (`zipfile`+`iterparse`,
  mandatory `elem.clear()`). **Do NOT use openpyxl** — it raises `ValueError` on this file's
  malformed numeric cell (`"1.057.000"`, actually in `tensile_strength_mpa_b`/col BL). A numeric
  cell that fails `float()` is kept as a raw string then coerced to `None` for `number` columns.
  `columns.py::coerce_value` is the single typing source of truth (text/number/date; Excel serial
  epoch `1899-12-30`).
- **Ingestion** (`services/jsw_stock/ingest.py`): parse → normalize Party Code (`lstrip("0")`) →
  batch-map to `CustomerCode.code` (first-match wins, code NOT unique; internal yards 8001/8451-style
  stay unmapped) → **save-time gate** (`utils/jsw_stock/filters.py::should_keep_row`): a row is
  persisted ONLY if ALL of the following hold: (1) normalized Party Code matches a `CustomerCode`
  (unmatched codes are now **rejected**, not saved); (2) `so_product_form == "S_HRCF"`
  (case-insensitive); (3) `blocked == 0`; (4) `sales_order_type ∉ {ZAUF, ZVSR}` and does not match
  `ZRE\d+`; (5) NCO rule — keep "No"; keep "Yes" only when `do_no` is non-empty; drop "Yes" with
  empty `do_no` → idempotent `find({report_date}).delete()` then `insert_many` in 1000-row chunks
  (count via `len(chunk)`, NOT `InsertManyResult`) → emit `jsw_stock.ingested`.
- **Scheduler** (`core/scheduler.py`): `apply_jsw_stock_schedule()` (called from
  `config_service.upsert_config`) add/replaces or removes the `jsw_stock.poll` `IntervalTrigger`
  job; guard `remove_job` with `get_job(...)` (it raises `JobLookupError` if absent). All
  scheduler↔cron↔service imports are **local** (`# noqa: PLC0415`) to break a circular chain.
  `poller.run_poll()` uses **local `datetime.now()`** for the window/date folder (not UTC).
- **Audit**: new `"jsw_stock"` category (singular — unlike plural `regions`/`customer_codes`) in
  `models/audit_log.py` + `schemas/audit_log.py` + `services/audit_log/options.py::_CATEGORIES`;
  `audit_jsw_stock_event` helper in `services/audit/events.py`.
- **CORS**: `main.py` `allow_methods` now includes `PUT` (for the config endpoint).

### JVML Stock Excel automation (domain `jvml_stock`)

Second scheduled-ingestion domain — a **near-exact clone of `jsw_stock`** for the `JVML Stock (99).xlsx`
SAP export (same **72-column** structure, same raw-zip parser + `coerce_value` typing, same
Party-Code→`CustomerCode` mapping, same idempotent `find({report_date}).delete()` + 1000-row
`insert_many`, same poller window/date-folder logic with **local** `datetime.now()`). Endpoints mirror
JSW under the `jvml-stock` / `/admin/jvml-stock` prefixes (list is non-admin `get_current_user`; config
is admin). Differences from JSW:

- **Filters: 4, not 10/12.** Both the `/jvml-stock` list endpoint and `/jvml-stock/options` now use
  the **same 5-filter surface as JSW**: single `date` (`dd-mm-yyyy`, exact match on `report_date`) +
  4 per-field async-select filters. `JvmlStockField` Literal = `sales_order_type, customer_name,
  sales_office, nco_declared`. No free-text `q`; no `dateFrom`/`dateTo`. `jsw_grade` is no longer a
  per-field filter — it remains a **data column** and `JvmlStockSortBy` member; do NOT rename it to
  `jvml_grade`. JVML applies the identical save-time ingestion gate (`utils/jvml_stock/filters.py::should_keep_row`):
  same 5 conditions as JSW (matched Party Code, `so_product_form == S_HRCF`, `blocked == 0`,
  `sales_order_type ∉ {ZAUF,ZVSR,ZRE<number>}`, NCO/DO rule). Unmatched party codes are rejected at ingest.
- **Models** (collections): `JvmlStock` (`jvml_stock`), `JvmlStockConfig` (`jvml_stock_configs`, singleton
  `key="default"`), `JvmlStockIngestion` (`jvml_stock_ingestions`, unique `report_date`) — all three in
  `core/database.py::DOCUMENT_MODELS`.
- **Scheduler**: `apply_jvml_stock_schedule()` (async, in `core/scheduler.py`) + `JVML_STOCK_JOB_ID =
  "jvml_stock.poll"`; boot-registered in `start_scheduler` alongside JSW. Cron job `jvml_stock_poll_job`
  (`cron.jvml_stock_poll`) in `services/cron/jvml_stock.py`.
- **Audit**: `"jvml_stock"` category added to both `AuditCategory` Literals + `_CATEGORIES`;
  `audit_jvml_stock_event` helper in `services/audit/events.py`.
- All `jvml_stock` registrations sit **next to** the JSW ones (additive) — both domains coexist.

### Credit Report Excel automation (domain `credit_report`)

Third scheduled-ingestion domain — cloned from `jvml_stock` for `macro_files/credit report.XLSX`
(SAP Credit Management, **33 columns**). Same config/poller/scheduler/missing-alert pipeline. Endpoints
under `/credit-report` (non-admin list `get_current_user`) + `/admin/credit-report` (admin config).
Differences from the stock domains:

- **No customer mapping.** The file has a native `Customer Name` column, so there is NO
  Party-Code→`CustomerCode` lookup: no `customer_map.py`, no `party_code_normalized`/`customer_code_id`
  fields. `services/credit_report/ingest.py` parses → coerces all 33 columns → applies the gate →
  inserts (1000-row chunks). `serialize.py` maps the 33 cols + 4 meta fields (`report_date`,
  `source_file`, `created_at`, `updated_at`).
- **Ingestion gate** (`utils/credit_report/filters.py::should_keep_row(coerced)` — **ONE arg**):
  keep a row only when `customer_name` is non-empty AND `credit_control_area ∈ {"JV0H","VJ0H"}`
  (case-insensitive). On the real file: 195 rows → **34 kept (19 VJ0H + 15 JV0H)**.
- **List filters = 6** (`CreditReportField` Literal has the 4 async-select: `customer_name`, `city`,
  `customer`, `cca_description`). `CreditReportListQuery` = `sortBy` + `date` (report_date exact,
  optional) + the 4 async filters + `blocked` (`Literal["blocked","unblocked"]` → `"X"` /
  `{$in:[None,""]}`) + `credit_balance_sign` (`Literal["positive","negative"]` → `{$gte:0}` /
  `{$lt:0}`). Controller `_ALLOWED_LIST_KEYS` = 11. `blocked` is a **text** column ("X" or None);
  `credit_balance` is `float | None` and is the indexed sort/sign-filter field.
- **Parser**: reuses the tolerant raw-zip `utils/credit_report/excel.py` + `coerce_value`. The
  `#VALUE!` error string in `Validity Period End` coerces to `None` (no special-case). Date columns
  (`validity_period_start`, `validity_period_end`) are Excel serials → datetime.
- **Models** (collections): `CreditReport` (`credit_report`), `CreditReportConfig`
  (`credit_report_configs`, singleton `key="default"`), `CreditReportIngestion`
  (`credit_report_ingestions`, unique `report_date`) — all three in `core/database.py::DOCUMENT_MODELS`.
- **Scheduler**: `apply_credit_report_schedule()` + `CREDIT_REPORT_JOB_ID="credit_report.poll"` /
  `CREDIT_REPORT_DEADLINE_JOB_ID`; boot-registered in `start_scheduler`. Cron job
  `credit_report_poll_job` (`cron.credit_report_poll`) in `services/cron/credit_report.py`.
  **Import-order rule:** `services/cron/__init__.py` imports `heartbeat` (which defines `audited_job`)
  FIRST, then the domain jobs — otherwise a partially-initialized circular import.
- **Audit**: `"credit_report"` category added to both `AuditCategory` Literals + `_CATEGORIES` +
  `_CATEGORY_PREFIXES` (BOTH `/credit-report` and `/admin/credit-report`); `audit_credit_report_event`
  helper in `services/audit/events.py`.

### Report JSW/JVML feature (domain `report`)

Cross-domain **read-only** "Coil Stock" pivot for a date + report type + optional region + aging
day-filter, augmented with credit-report checks. Endpoint: `GET /report/generate` (non-admin,
`get_current_user`). Query (4 keys, unknown-key rejected): `date` (`dd-mm-yyyy`), `report_type`
(`jsw`|`jvml`), `region_id?` (empty ⇒ all regions), `days` (`include`|`exclude`|`only`).

- **Algorithm** (`services/report/`): `generate.py` orchestrates → resolve region→`customer_codes`
  (`_resolve_codes`, codes normalized via `utils/report/normalize.py::normalize_code` = `lstrip("0")`,
  the **canonical** normalizer both ingest pollers now import) → `pivot.py::aggregate_pivot` runs ONE
  Mongo `$group` (no projection_model; `_id` sub-doc `{distr_chnl, party}`; `$sum stock_quantity`;
  conditional `$sum` for NCO=="Yes" qty + count; `$first` sold_to_party/route_desc; aging clause is
  type-bracketed `$lte 2` / `$gt 2` so null aging only appears under `include`) → `credit.py`
  (`coil_price_per_qty` = active `CoilPrice` lowest-quantity `.sort("+quantity").first_or_none()`,
  `price/quantity`; `build_credit_map` is **CCA-scoped at the query** — `has_credit_report` is true only
  when rows exist for THIS report's CCA) → assemble channels (8 distr_chnl values + `None`→`"Unspecified"`,
  ordered; per-channel + grand coil subtotals).
- **CCA mapping (verified vs macro_docs):** `jsw`→`VJ0H`, `jvml`→`JV0H`. A customer appears under both
  CCAs — querying the wrong one surfaces the wrong balance.
- **Credit columns** (per party, all computed server-side): `blocked` (=`blocked=="X"`), `credit_balance`
  (SAP headroom), `required_credit` = `(total - nco_yes_do) * price_per_qty`, `credit_sufficient`,
  `credit_status` (`""`|`"No Credit balance"`|`"NO CREDIT REPORT FOUND"`), and `credit_note` verdict
  (`Balance Available`|`Not Enough Balance`|`Balance Negative`|`No Credit balance`|`NO CREDIT REPORT FOUND`).
- **Edge cases:** no stock docs for date → `has_stock=false`; no credit rows for date+CCA →
  `has_credit_report=false` (all credit cells `NO CREDIT REPORT FOUND`); party absent / balance None →
  `No Credit balance`; no active coil price → `required_credit=null`.
- **Audit:** `"report"` category added to both `AuditCategory` Literals + `_CATEGORIES` +
  `_CATEGORY_PREFIXES` (`/report`, before the `/admin` fallback).
- Files: `schemas/report.py`, `services/report/{generate,pivot,credit}.py`, `utils/report/normalize.py`,
  `controllers/report.py`, `routes/report.py` (both register lines in `routes/__init__.py`). Spec +
  audit + review: `.planning/report-jsw-jvml/{SPEC,AUDIT,REVIEW}.md`.

---

## Code Layout

Layered — one responsibility per layer, every file ≤250 lines. Request flow is
**route → controller → service → (model / core) → envelope**.

```
backend/
  .env                        # live local config (gitignored)
  requirements.txt
  run.sh                      # exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  app/
    __init__.py               # __version__
    main.py                   # create_app(): CORS, security headers, AuditMiddleware, lifespan (+scheduler/startup audit), router include
    core/                     # cross-cutting concerns
      config.py               # Settings (env / .env) — incl. audit_*/cron_* knobs
      database.py             # init_db / close_db — AsyncMongoClient + Beanie (DOCUMENT_MODELS=[User, AuditLog])
      security.py             # hash_password / verify_password (bcrypt)
      sessions.py auth_deps.py ratelimit.py   # session JWT · get_current_user/admin deps · login rate limit
      scheduler.py            # AsyncIOScheduler lifecycle (audited cron jobs)
      email.py  otp.py        # SMTP delivery (Mailjet) + dev-log fallback · OTP gen/hash + renderers
      errors.py               # AppError taxonomy (Validation/Unauthorized/NotFound/Conflict/…)
      responses.py            # SuccessEnvelope / ErrorEnvelope / PaginationMeta + success()
      exception_handlers.py   # centralized handlers -> error envelope
    middleware/
      audit.py                # pure-ASGI AuditMiddleware: captures EVERY HTTP request/response
    models/
      user.py                 # User Beanie Document (collection "users")
      audit_log.py            # AuditLog Beanie Document (collection "audit_logs")
    schemas/                  # Pydantic I/O DTOs — the typed contract layer
      common.py               # PageQuery (pagination base)
      meta.py  auth.py  otp.py  user.py  admin_user.py  audit_log.py
    services/                 # business logic; transport-free; raise typed errors
      meta/ping.py   auth/login.py   user/list.py user/seed.py   admin_user/*.py
      audit/                  # record.py (writer — NEVER raises) · redact.py · events.py (semantic helpers)
      audit_log/              # list.py get.py options.py serialize.py — admin read API
      cron/heartbeat.py       # @audited_job-wrapped heartbeat job (APScheduler)
    controllers/              # thin: validated input -> service -> envelope
      meta.py  auth.py  user.py  admin_user.py  audit_log.py
    routes/                   # APIRouter registration per domain
      __init__.py             # api_router aggregator
      meta.py  auth.py  user.py  admin_user.py  audit_log.py
    utils/
      user/query.py  admin_user/query.py  audit_log/query.py
    scripts/
      seed.py                 # `python -m app.scripts.seed`
      send_test_email.py      # `python -m app.scripts.send_test_email <to>` — verify SMTP/Mailjet
```

Add a new domain by mirroring the route/controller/service/schema set
(`scaffold-standards`, `domain-scaffold-patterns`).

### Audit logging (cross-cutting — applies to ALL new backend work)

`AuditMiddleware` (the **outermost** middleware, added last in `create_app`) records every
HTTP request+response into the `audit_logs` collection automatically — **new endpoints are
audited with zero extra code**. Key facts:

- **Writer**: `services/audit/record.py::record_audit` (never raises; failures only log) +
  `spawn_audit` (fire-and-forget, does not block the response).
- **Redaction**: `services/audit/redact.py` masks secrets by **substring match** on key names
  (`password`/`token`/`secret`/`cookie`/`apikey`/`authorization` → catches camelCase like
  `newPassword`, `accessToken`) plus exact keys (`otp`, `app_session`). A bare `code` is **not**
  redacted (it would clobber API error codes). Bodies are size-capped to `audit_max_body_bytes` (16KB).
- **Category derivation**: `_category(path)` in `middleware/audit.py` maps request paths to
  audit categories by prefix — **per-domain, not a blanket `/admin/*`→`"admin"` rule**:
  `/admin/regions/*`→`regions`; `/admin/coil-prices/*`→`coil_config`; `/admin/customer-codes/*`→`customer_codes`;
  `/admin/jsw-stock/*`→`jsw_stock`; `/admin/jvml-stock/*`→`jvml_stock`;
  `/admin/users/*` and `/users`→`users`; `/jsw-stock/*`→`jsw_stock`;
  `/jvml-stock/*`→`jvml_stock`; `/auth/*`→`auth`; any other `/admin/*`→`admin`;
  everything else→`http`. When adding a new domain, add its prefix here.
- **Audit category taxonomy** (`AuditCategory` Literal): `auth`, `users`, `admin`,
  `regions`, `coil_config`, `customer_codes`, `jsw_stock`, `jvml_stock`, `credit_report`, `report`, `http`. Defined in
  `models/audit_log.py` and `schemas/audit_log.py` (kept in sync); also listed in
  `services/audit_log/options.py::_CATEGORIES` (drives the `/facets` endpoint).
  The frontend mirrors this in `src/types/admin/audit-log.ts` and `AuditCategoryBadge.tsx`.
- **Non-HTTP code paths** (cron, scripts, background tasks, lifecycle): call the awaitable helpers
  in `services/audit/events.py` — `audit_system_event` / `audit_cron_event` / `audit_security_event`
  / `audit_auth_event` / `audit_user_event` (category `users`). `system.startup` /
  `system.shutdown` are emitted from the `main.py` lifespan.
- **Cron**: `core/scheduler.py` runs an `AsyncIOScheduler`; wrap any new job with the
  `@audited_job("cron.<name>")` decorator (`services/cron/heartbeat.py`) so each run is auto-audited.
- **Read API** is admin-only (`Depends(get_current_admin)`), mirrors the `admin_user` domain:
  paginated list + `Literal` sort whitelist + unknown-query-key rejection, plus `/options`,
  `/facets`, `/{id}`. `audit_skip_paths` excludes noise (`/health`, `/ping`, docs) and the
  audit read endpoints themselves.
- **Config knobs** (`core/config.py`): `audit_enabled`, `audit_capture_request_body`,
  `audit_capture_response_body`, `audit_max_body_bytes`, `audit_skip_paths`,
  `audit_skip_path_prefixes`, `cron_enabled`, `audit_heartbeat_minutes`.
- New dep: `APScheduler` (pinned in `requirements.txt`).

### User model (`app/models/user.py`, collection `users`)

```python
class User(Document):
    emailid: Annotated[EmailStr, Indexed(unique=True)]  # login key, unique index
    password: str            # bcrypt hash — NEVER plaintext (see core.security)
    lastlogined: datetime | None = None
    isAdmin: bool = False
```

### CORS origins (allow_credentials=True, methods/headers="*")

Defined in `core/config.py` (`Settings.cors_origins`):

- `http://localhost:5173` (Vite dev)
- `http://127.0.0.1:5173`
- `http://localhost:4173` (Vite preview)

### Email / SMTP (Mailjet)

OTP and invite emails are sent through `core/email.py` (`send_email` — async, runs
`smtplib` in `asyncio.to_thread`; **never re-raises** so a failed email can't abort a
request). Two transports, chosen by env:

- **Dev fallback** — `SMTP_HOST` empty → email body (incl. OTP) logged at INFO, nothing sent.
- **Mailjet relay** — `SMTP_HOST=in-v3.mailjet.com`, `SMTP_USER=<API Key>`,
  `SMTP_PASSWORD=<Secret Key>`, `SMTP_FROM=<Mailjet-validated sender>`. Port **587 +
  `SMTP_STARTTLS=true`** (recommended) or port **465 + `SMTP_SSL=true`** (implicit TLS;
  `smtp_ssl` skips STARTTLS). Unvalidated `SMTP_FROM` senders are rejected by Mailjet.

Config knobs: `smtp_host/port/user/password/from/starttls/ssl` in `core/config.py`. Full
template in `backend/.env.example`. Verify a live relay with
`./.venv/bin/python -m app.scripts.send_test_email <to>` (surfaces SMTP errors instead of
swallowing them).

---

## Current Scope

- Domains implemented end-to-end: **meta** (`/`, `/health`, `/ping`, `/ws/ping`),
  **auth** (`POST /auth/login`), **user** (`GET /users` + admin seed).
- MongoDB via Beanie: `User` model + idempotent admin seed. No migrations (schemaless;
  Beanie creates the unique `emailid` index on init).
- Standard envelope on every JSON endpoint; typed `AppError` taxonomy → centralized
  handlers; backend-driven pagination + sort whitelist on the list endpoint.
- No session/JWT issuance yet — `/auth/login` verifies credentials and stamps
  `lastlogined` but does not mint a token. Add a token/session service when needed.
- `_ping_counter` is in-process only (in `services/meta/ping.py`); resets on restart.

---

## Mandatory Backend Rules

**Apply every backend craft skill on every backend change** — all 27, not just when
convenient. They are enforced via `~/.claude/` hooks; this codebase is their realization.
Full list: `~/.claude/rules/agent-lifecycle-routing.md`.

1. **Layering**: route → controller → service → schema/model. Thin controllers; **all**
   business logic + DB access live in services (`service-layer-standards`).
2. **Contract**: success `{success, data, message, meta}`; error `{success:false,
   error:{code, message, details}}` (`api-contract-standards`). Don't rename response keys casually.
3. **Errors**: services raise typed `AppError` subclasses; never leak raw exceptions or
   stack traces — the centralized handlers map them (`backend-error-handling`).
4. **List endpoints**: backend-driven pagination, sort whitelist (Pydantic `Literal`),
   unknown keys rejected, `maxLimit=100` (`backend-api-standards`).
5. **Security**: bcrypt hashes, generic auth errors (no user enumeration), no secrets in
   source, validate every external input (`owasp-security`, `security-and-hardening`).
6. **File size**: no file > 250 lines — split before adding behavior.
7. **Type discipline**: full annotations; Pydantic schemas for all I/O.
8. **Source-driven**: verify framework APIs against the *installed* version before coding
   (`source-driven-development`) — e.g. Beanie 2.x uses `AsyncMongoClient`, not Motor.
