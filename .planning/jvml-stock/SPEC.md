# JVML Stock Excel Automation — Build SPEC (authoritative)

> Single source of truth for the multi-agent build. Every builder agent MUST read
> this file first and conform to it EXACTLY (field names, signatures, file paths,
> query keys). Mirror the existing `customer_code` / `region` / `audit_log` domains
> — they are the reference implementations. Every file ≤ 250 lines.
>
> **CONCURRENCY GUARDRAIL (read this):** A SEPARATE Claude session is building the
> analogous **JSW Stock** feature (`jsw_stock` namespace, `ZSD_CURRSTK_HR.xlsx`) in
> the SAME working tree. To avoid clobbering it:
> - This feature uses the `jvml_stock` / `jvml-stock` / `JvmlStock` namespace ONLY.
>   NEVER create, edit, read-then-overwrite, or delete any `jsw_stock` / `jsw-stock`
>   / `JswStock` file. NEVER touch `.planning/jsw-stock/`.
> - Builder agents create NEW jvml-namespaced files only. They MUST NOT edit shared
>   files (`models/__init__.py`, `core/database.py`, `core/scheduler.py`,
>   `routes/__init__.py`, `services/audit/events.py`, `models/audit_log.py`,
>   `schemas/audit_log.py`, `services/audit_log/options.py`, `api/client.ts`,
>   `components/layout/nav-items.ts`, `App.tsx`, the Settings page, audit-log FE
>   category union/badge). All shared-file wiring is done by the ORCHESTRATOR in a
>   single serialized pass with append-only edits.

## 0. Feature summary

Three capabilities:

1. **Settings → JVML Stock Excel Config** (admin-only, `/admin/settings`): enable/disable;
   set `base_path`, `file_name` (no extension), `start_time`/`end_time` (HH:MM window),
   `interval_hours` (1–24), and `notify_emails`. Persisted as a singleton config; saving
   (re)schedules the backend poll job.

2. **Backend scheduled ingestion** (APScheduler): while enabled & inside the daily time
   window, look in `<base_path>/<dd-mm-yyyy>/<file_name>.xlsx` (create the dated folder if
   missing). When the file appears: parse ALL rows/columns of a `JVML Stock (99).xlsx`-shaped
   workbook (72 cols), map each row's Party Code → CustomerCode (save `customer_name` +
   `customer_code_id`), bulk-insert into Mongo, mark that date done (stop looking that day).
   If the file never arrives by `end_time`, email everyone in `notify_emails` once
   ("JVML STOCK EXCEL not found").

3. **JVML Stock List** (all authenticated users, `/jvml-stock`, nav item directly below
   Dashboard): server-driven paginated table with **10** backend async-select filters +
   free-text search + `createdAt` date-range, plus a detail sheet showing every stored
   column. Consistent with the existing admin list pages.

## 1. Canonical column map (THE contract for ingestion)

The source workbook `macro_files/JVML Stock (99).xlsx` has **72 columns** (~3,388 data rows).
Stored field names are snake_case. Type tag drives coercion: `text` → trimmed string (numeric
Excel cells with an integer value rendered without trailing `.0`; **non-floatable numerics like
`"1.057.000"` kept verbatim as string**), `number` → `float | None`, `date` → `datetime | None`
(Excel serial via epoch `1899-12-30`, or `dd.mm.yyyy` / ISO text; `"NA"` → None).

`#` = source column order (1-based). `filter` = exposed as a per-field async filter + in the
`JvmlStockField` Literal. `q` = included in free-text `$or` search.

| # | Excel header | field (snake_case) | type | filter | q |
|--|--|--|--|--|--|
| 1 | SO Sales Org | `so_sales_org` | text | ✅ | |
| 2 | Sales Order Type | `sales_order_type` | text | ✅ | |
| 3 | Distr.Chnl | `distr_chnl` | text | ✅ | |
| 4 | Sold To Party | `sold_to_party` | text | ✅ | ✅ |
| 5 | Party Code | `party_code` | text | | ✅ |
| 6 | Ship To Party | `ship_to_party` | text | | ✅ |
| 7 | Customer | `customer` | text | ✅ | ✅ |
| 8 | Material | `material` | text | ✅ | ✅ |
| 9 | Sales Office | `sales_office` | text | ✅ | ✅ |
| 10 | SO-Product Form | `so_product_form` | text | ✅ | |
| 11 | JSW Grade | `jsw_grade` | text | ✅ | ✅ |
| 12 | Act.Thickness (mm) | `act_thickness_mm` | text | | |
| 13 | Width (mm) | `width_mm` | text | | |
| 14 | Batch | `batch` | text | | ✅ |
| 15 | Unrestr.Qty. | `unrestr_qty` | number | | |
| 16 | In Quality Insp. | `in_quality_insp` | number | | |
| 17 | Blocked | `blocked` | number | | |
| 18 | Stock Quantity | `stock_quantity` | number | | |
| 19 | Usage Decision | `usage_decision` | text | | |
| 20 | NCO Declared | `nco_declared` | text | ✅ | |
| 21 | Next Workcenter | `next_workcenter` | text | | |
| 22 | Length(mm) | `length_mm` | text | | |
| 23 | NCO Reason | `nco_reason` | text | | |
| 24 | UD Remarks | `ud_remarks` | text | | |
| 25 | Aging | `aging` | number | | |
| 26 | Production Date | `production_date` | date | | |
| 27 | Shift | `shift` | text | | |
| 28 | Sales Order No | `sales_order_no` | text | | ✅ |
| 29 | SO Item Num | `so_item_num` | text | | |
| 30 | Order Status | `order_status` | text | | |
| 31 | Location | `location` | text | | |
| 32 | STR No | `str_no` | text | | |
| 33 | STO No | `sto_no` | text | | |
| 34 | DO No | `do_no` | text | | |
| 35 | Shipment | `shipment` | text | | |
| 36 | Storage Location | `storage_location` | text | | |
| 37 | Port Name | `port_name` | text | | |
| 38 | UNLOADING POINT | `unloading_point` | text | | |
| 39 | RECIEVING POINT | `recieving_point` | text | | |
| 40 | Purchase Order Number | `purchase_order_number` | text | | |
| 41 | Scheduled Status | `scheduled_status` | text | | |
| 42 | Eq. Specification | `eq_specification` | text | | |
| 43 | Eq. Sub Grade | `eq_sub_grade` | text | | |
| 44 | SO-End Application | `so_end_application` | text | | |
| 45 | production workcenter | `production_workcenter` | text | | |
| 46 | YS in MPa | `ys_in_mpa` | number | | |
| 47 | ELONGATION | `elongation` | text | | |
| 48 | Elongation(Mic) | `elongation_mic` | number | | |
| 49 | HARDNESS | `hardness` | text | | |
| 50 | S_ALUMINIUM_PCT | `s_aluminium_pct` | number | | |
| 51 | S_BORON_PCT | `s_boron_pct` | number | | |
| 52 | S_CARBON_PCT | `s_carbon_pct` | number | | |
| 53 | S_CHROMIUM_PCT | `s_chromium_pct` | number | | |
| 54 | S_COPPER_PCT | `s_copper_pct` | number | | |
| 55 | S_MANGANESE_PCT | `s_manganese_pct` | number | | |
| 56 | S_MOLYBDENUM_PCT | `s_molybdenum_pct` | number | | |
| 57 | S_NICKEL_PCT | `s_nickel_pct` | number | | |
| 58 | S_NIOBIUM_PCT | `s_niobium_pct` | number | | |
| 59 | S_PHOSPHORUS_PCT | `s_phosphorus_pct` | number | | |
| 60 | S_SILICON_PCT | `s_silicon_pct` | number | | |
| 61 | S_SULPHUR_PCT | `s_sulphur_pct` | number | | |
| 62 | S_TITANIUM_PCT | `s_titanium_pct` | number | | |
| 63 | S_VANADIUM_PCT | `s_vanadium_pct` | number | | |
| 64 | Tensile Strength MPa (B) | `tensile_strength_mpa_b` | number | | |
| 65 | YIELD STRENGTH | `yield_strength` | text | | |
| 66 | UTS | `uts` | text | | |
| 67 | Special Stock | `special_stock` | text | | |
| 68 | CP Number | `cp_number` | text | | |
| 69 | CP End Date | `cp_end_date` | date | | |
| 70 | LC Exp Date | `lc_exp_date` | text | | |
| 71 | Route | `route` | text | | |
| 72 | Route Desc | `route_desc` | text | | |

> NOTE: The JVML workbook is **column-identical to the ZSD/JSW layout** — all 72 headers match
> exactly (verified against the real file `macro_files/JVML Stock (99).xlsx`). Real data:
> `Party Code` is zero-padded 10-digit (e.g. `0000008662`); `Customer` is the short numeric code
> (e.g. `8662`); `Production Date` (col 26) and `CP End Date` (col 69) are **Excel numeric serials**
> (e.g. `46065` → `datetime` via epoch `1899-12-30`); number columns hold integer-as-string values
> (`"0"`) and floats in scientific notation (`"4.9E-2"`); many text columns are empty strings
> (→ None after strip). The raw-zip tolerant parser is still required (defensive: keep any
> non-floatable numeric cell as a verbatim string rather than crashing like openpyxl).

**Mapping + meta fields appended to every stored doc:**

| field | type | notes |
|--|--|--|
| `party_code_normalized` | `str \| None` (indexed) | `party_code.lstrip("0")` — join key |
| `customer_name` | `str \| None` (indexed) | from matched `CustomerCode.customer`, else None |
| `customer_code_id` | `str \| None` (indexed) | matched `CustomerCode` `_id` hex, else None |
| `report_date` | `str` (indexed) | source folder date, `dd-mm-yyyy` |
| `source_file` | `str` | absolute path the row was ingested from |
| `created_at` | `datetime` (indexed, default now UTC) | **the date-range filter field** |
| `updated_at` | `datetime` | set on insert |

**Indexed fields** (single-field `Indexed()`): the 10 filter fields, `party_code`,
`ship_to_party`, `party_code_normalized`, `customer_name`, `customer_code_id`, `report_date`,
`created_at`.

**`JvmlStockField` Literal (10, exact order):** `so_sales_org`, `sales_order_type`, `distr_chnl`,
`sold_to_party`, `customer`, `material`, `sales_office`, `so_product_form`, `jsw_grade`,
`nco_declared`.

**`JvmlStockSortBy` Literal:** `created_at`, `report_date`, `customer`, `customer_name`,
`party_code`, `sold_to_party`, `ship_to_party`, `material`, `jsw_grade`, `sales_office`,
`so_sales_org`, `sales_order_type`, `distr_chnl`, `so_product_form`, `nco_declared`, `batch`,
`unrestr_qty`, `stock_quantity`, `aging`. Default `created_at`.

**q `$or` fields:** `sold_to_party`, `ship_to_party`, `customer`, `party_code`, `customer_name`,
`material`, `jsw_grade`, `batch`, `sales_order_no`, `sales_office`.

## 2. Backend — NEW files

> Layered exactly like `customer_code`: route → controller → service → schema/model + utils.
> Envelope `{success,data,message,meta}`; `Literal` sort whitelist; unknown-query-key rejection
> via frozenset; `re.escape` on all `$regex` inputs; typed `AppError`s; no file > 250 lines.
> `AsyncOption` is imported from `app.schemas.admin_user`. `success()` from `app.core.responses`.
> `PageQuery`/`PaginationMeta` from `app.schemas.common`. Auth deps from `app.core.auth_deps`.

### Models
- `app/models/jvml_stock.py` — `JvmlStock(Document)`, collection `jvml_stock`. All 72 fields (types
  per §1) + 7 mapping/meta fields. Index per §1. `_now_utc` default factory (copy from
  `customer_code.py`). Keep docstrings terse (1 line) to stay ≤250 lines. `class Settings: name = "jvml_stock"`.
- `app/models/jvml_stock_config.py` — `JvmlStockConfig(Document)`, collection `jvml_stock_configs`.
  Fields: `key: Annotated[str, Indexed(unique=True)] = "default"`, `enabled: bool = False`,
  `base_path: str = ""`, `file_name: str = ""`, `start_time: str = "08:00"`, `end_time: str = "20:00"`,
  `interval_hours: int = 1`, `notify_emails: list[str] = Field(default_factory=list)`,
  `created_at`, `updated_at`.
- `app/models/jvml_stock_ingestion.py` — `JvmlStockIngestion(Document)`, collection
  `jvml_stock_ingestions`. Fields: `report_date: Annotated[str, Indexed(unique=True)]`,
  `status: str` (`pending`/`ingested`/`missing`/`alerted`/`error`), `row_count: int = 0`,
  `file_path: str | None = None`, `found_at: datetime | None = None`,
  `alerted_at: datetime | None = None`, `error: str | None = None`, `created_at`, `updated_at`.

### Schemas
- `app/schemas/jvml_stock.py` — `JvmlStockSortBy`, `JvmlStockField` Literals; `JvmlStockListQuery(PageQuery)`
  with `sortBy: JvmlStockSortBy = "created_at"`, `q: str|None (max_length=200)`, the **10** per-field
  `str|None (max_length=200)` filters, and `dateFrom: str|None`, `dateTo: str|None` (ISO-8601 strings,
  matched against `created_at`); `JvmlStockOptionsQuery(BaseModel)` = `field: JvmlStockField`,
  `q: str|None`, `limit: int = 20 (1..50)`.
- `app/schemas/jvml_stock_record.py` — `JvmlStockPublic(BaseModel)`: `id: str` + ALL 72 fields (text→`str|None`,
  number→`float|None`, date→`datetime|None`) + `party_code_normalized`, `customer_name`,
  `customer_code_id` (`str|None`), `report_date: str`, `source_file: str|None`,
  `created_at: datetime`, `updated_at: datetime`. (Used for both list rows and the detail sheet.)
- `app/schemas/jvml_stock_config.py` — `JvmlStockConfigPublic` (enabled, base_path, file_name, start_time,
  end_time, interval_hours, notify_emails, updated_at | None); `JvmlStockConfigUpdate` (PUT body):
  `enabled: bool`, `base_path: str (max_length=500)`, `file_name: str (max_length=200)`,
  `start_time: str`, `end_time: str`, `interval_hours: int (ge=1, le=24)`,
  `notify_emails: list[EmailStr] (max_length=100)`. Validators (pydantic v2 `field_validator`):
  strip base_path; `file_name` stripped + reject `/ \ ..` (path-traversal guard, raise `ValueError`);
  `start_time`/`end_time` match `^([01]\d|2[0-3]):[0-5]\d$`; lowercase+dedupe emails (mirror
  `schemas/region.py`). `JvmlStockStatusPublic` (enabled, last_report_date, last_status,
  last_row_count, last_found_at, last_alerted_at, last_error, recent: list[`JvmlStockIngestionRow`]).
  `JvmlStockIngestionRow` = report_date, status, row_count, found_at, created_at.

### Utils — `app/utils/jvml_stock/`
- `__init__.py` (empty package marker).
- `columns.py` — THE column source of truth. Exports:
  - `COLUMNS: list[tuple[str, str, str]]` = (excel_header, field, type) for all 72 (per §1).
  - `HEADER_TO_FIELD: dict[str, str]` keyed by **normalized** header (`re.sub(r"\s+"," ", h).strip().lower()`).
  - `FIELD_TYPES: dict[str, str]`.
  - `TEXT_FIELDS`, `NUMBER_FIELDS`, `DATE_FIELDS` tuples.
  - `normalize_header(h: str) -> str`.
  - `coerce_value(field: str, raw) -> str|float|datetime|None` applying the type rule. For `text`:
    `None`→None; float integer-valued→`str(int(v))`; other float→`str(v)`; str→`v.strip() or None`.
    For `number`: `float(raw)` if parseable else None. For `date`: int/float→`datetime(1899,12,30)+
    timedelta(days=raw)`; str→try `%d.%m.%Y` then `%Y-%m-%d`/iso, else None.
  - `excel_serial_to_datetime(serial: float) -> datetime`.
  - Data-only, no logic bloat — keep ≤250 lines.
- `excel.py` — `parse_workbook(data: bytes) -> list[dict[str, object]]`. Tolerant raw-zip parser
  (do NOT use openpyxl — it crashes on malformed numeric cells). Steps: `zipfile.ZipFile` over the
  bytes; read `xl/sharedStrings.xml` (build shared-string list, concatenating all `<t>` runs per
  `<si>`) + stream `xl/worksheets/sheet1.xml` with `xml.etree.ElementTree.iterparse`. For each `<c>`:
  resolve value by `t` attr — `s`→sharedStrings[int(v)], `inlineStr`→`<is>` `<t>` text, `str`/`b`→`<v>`
  text, default (numeric)→`float(v)` if it parses else the raw `<v>` text string (the malformed-cell
  guard). Map column letters (from the `r` ref, e.g. `AB12`) → 0-based index via `col_index(ref)`;
  row 1 = header → build `index→field` using `HEADER_TO_FIELD` (drop unmapped/blank header columns).
  For each data row return `{field: raw_value}` (raw — typing applied later by `coerce_value`). Strip
  the XML namespace when matching tags. Skip fully-empty rows. ≤250 lines.
- `query.py` — `build_jvml_stock_filter(query) -> dict` (q `$or` over the 10 q-fields with
  `escape_regex`/`re.escape`; 10 per-field exact matches; `created_at` `$gte dateFrom` / `$lte dateTo`
  parsed via `datetime.fromisoformat`, tolerant of trailing `Z`); `build_sort(sort_by, sort_order) -> str`
  (`+`/`-` prefix). Mirror `utils/customer_code/query.py`.

### Services — `app/services/jvml_stock/`
- `__init__.py`.
- `serialize.py` — `to_jvml_stock_public(doc: JvmlStock) -> JvmlStockPublic` (map every field; `id=str(doc.id)`).
- `list.py` — `list_jvml_stock(query) -> tuple[list[JvmlStockPublic], PaginationMeta]`. Mirror
  `services/customer_code/list.py` (filter → count → sort/skip/limit → serialize → meta). No region lookup.
- `options.py` — `search_field_options(query: JvmlStockOptionsQuery) -> list[AsyncOption]`. Use
  `JvmlStock.distinct(query.field, filt)` (Beanie 2.x: filter is **2nd positional arg**). `filt` =
  `{field: {"$regex": re.escape(q), "$options": "i"}}` when `q` else `{}`. Reuse `AsyncOption`
  imported from `...schemas.admin_user`. Sort + cap at `limit`. Mirror `services/customer_code/options.py`.
- `customer_map.py` — `async build_customer_map(normalized_codes: set[str]) -> dict[str, tuple[str|None,str|None]]`.
  Query `CustomerCode.find({"code": {"$in": [...]}})`; first match per code wins. Returns
  `{code: (customer_name, customer_code_id_hex)}`. Guards empty set → `{}`.
- `ingest.py` — `async ingest_file(path: str, report_date: str) -> int`. Read bytes; `parse_workbook`;
  collect normalized party codes; `build_customer_map`; build `JvmlStock` docs (apply `coerce_value` per
  field; compute `party_code_normalized`, attach `customer_name`/`customer_code_id`, set `report_date`,
  `source_file=path`, `created_at`/`updated_at` now UTC). **Idempotent:** `await JvmlStock.find(
  {"report_date": report_date}).delete()` first, then `JvmlStock.insert_many(batch)` in chunks of 1000.
  Emit `audit_jvml_stock_event("jvml_stock.ingested", ...)`. Return inserted count.
- `poller.py` — `async run_poll() -> JvmlStockStatusPublic` (also callable standalone). Logic:
  load config singleton; if `not enabled` → return status. Validate `base_path`+`file_name` non-empty.
  `now = datetime.now()`; `today = now.strftime("%d-%m-%Y")`. Parse `start_time`/`end_time` → `time`.
  If `now.time() < start` → return (not yet in window). `folder = os.path.join(base_path, today)`;
  `os.makedirs(folder, exist_ok=True)`. Get/create today's `JvmlStockIngestion`. If `status=="ingested"`
  → return. `fpath = os.path.join(folder, file_name + ".xlsx")`. If `os.path.isfile(fpath)`:
  `count = await ingest_file(fpath, today)`; mark ingestion `ingested` (row_count, found_at,
  file_path). Else (missing): if `now.time() >= end` and `status != "alerted"` → `send_missing_alert(
  config, today)`, mark `alerted` (+ `alerted_at`); else mark `missing`. Wrap ingest in try/except → on
  failure mark `error` + audit `jvml_stock.failed`. Never raise out of `run_poll`. All filesystem +
  window logic lives here.
- `emails.py` — `render_missing_email(report_date, file_name, base_path) -> tuple[str,str,str]`
  (subject like `"⚠ JVML STOCK EXCEL not found — {report_date}"`); `async send_missing_alert(config,
  report_date) -> None` loops `notify_emails`, calls `core.email.send_email`. Emit
  `audit_jvml_stock_event("jvml_stock.missing_alert", ...)`. Never raises.
- `config_service.py` — `async get_config() -> JvmlStockConfigPublic` (singleton by `key="default"`,
  returns defaults if absent); `async upsert_config(body: JvmlStockConfigUpdate, *, actor_email) ->
  JvmlStockConfigPublic` (find-or-create singleton, set fields, bump `updated_at`, save; then call
  `apply_jvml_stock_schedule()` from `core.scheduler`; emit `audit_jvml_stock_event("jvml_stock.config_updated")`).
- `status.py` — `async get_status() -> JvmlStockStatusPublic` (latest ingestion + recent N=14 by
  `created_at` desc + config.enabled).

### Cron + scheduler
- `app/services/cron/jvml_stock.py` —
  ```python
  from ..audit.events import audit_cron_event  # if needed
  from .decorators import audited_job

  @audited_job("cron.jvml_stock_poll")
  async def jvml_stock_poll_job() -> None:
      from ...services.jvml_stock.poller import run_poll  # local import avoids cycles
      await run_poll()
  ```
- ORCHESTRATOR modifies `app/core/scheduler.py` (wiring, see §4): add
  `def apply_jvml_stock_schedule() -> None` that reads the config (sync wrapper or via a small
  async runner — see ADDENDUM) and add/replace (`IntervalTrigger(hours=interval_hours)`,
  `id="jvml_stock.poll"`, `replace_existing=True`, `next_run_time=datetime.now()`) when enabled,
  else `remove_job("jvml_stock.poll")` (guard missing job). Tolerate scheduler being `None`/not started
  (use `get_scheduler()`). In `start_scheduler`, after the heartbeat job, best-effort register the
  jvml job if config enabled (guard exceptions — Mongo may be down at startup).

### Controllers + routes
- `app/controllers/jvml_stock.py` — `list_jvml_stock_controller(request)` + `field_options_controller(request)`,
  both gated by `get_current_user` (NOT admin). Frozenset unknown-key rejection: list allowed keys =
  `{page,limit,sortBy,sortOrder,q,dateFrom,dateTo}` + the 10 filter fields; options allowed =
  `{field,q,limit}`. Mirror `controllers/customer_code.py` (minus import/template). Return `success(...)`
  with list meta `{"pagination": meta.model_dump()}`.
- `app/controllers/jvml_stock_config.py` — `get_config_controller`, `update_config_controller(body, current_admin)`,
  `get_status_controller`, `run_now_controller`, all gated by `get_current_admin`. `run_now` calls
  `await run_poll()` and returns the status envelope.
- `app/routes/jvml_stock.py` — TWO routers in one module:
  - `router = APIRouter(prefix="/jvml-stock", tags=["jvml-stock"], dependencies=[Depends(get_current_user)])`:
    `GET ""` (list), `GET "/options"` (options) — `/options` registered before any `/{id}` (none here,
    but keep order).
  - `config_router = APIRouter(prefix="/admin/jvml-stock", tags=["jvml-stock-admin"], dependencies=[Depends(get_current_admin)])`:
    `GET "/config"`, `PUT "/config"`, `GET "/status"`, `POST "/run-now"`.
  Both use `response_model=SuccessEnvelope[...]`. Export both `router` and `config_router`.

### Audit
- ORCHESTRATOR modifies `app/services/audit/events.py`: add `audit_jvml_stock_event(action, summary, *,
  outcome="success", actor_email=None, extra=None)` with `category="jvml_stock"`, `source="service"`
  (mirror `audit_customer_code_event`).

## 3. Frontend — NEW files

> Mirror `customer-codes` / `audit-logs`. Server-driven only (no client filtering). Types in
> `src/types/<domain>/`. API in `src/api/<domain>/`. ≤250 lines/file. Use shadcn primitives +
> semantic tokens. Reuse `AsyncCombobox`, `DateRangePicker`, `EmailChipInput`, `Field/FieldLabel/FieldError`.

### Types
- `src/types/jvml-stock/stock.ts` — `JvmlStockSortBy` (= §1 sort list), `JvmlStockField` (= 10),
  `JvmlStock` interface (id + ALL 72 fields with TS types: text→`string|null`, number→`number|null`,
  date→`string|null` ISO; + `party_code_normalized`, `customer_name`, `customer_code_id` `string|null`,
  `report_date: string`, `source_file: string|null`, `created_at: string`, `updated_at: string`),
  `JvmlStockListQuery extends PageQuery` (sortBy?, q?, the 10 filters?, `dateFrom?`, `dateTo?`).
- `src/types/jvml-stock/stock-ui.ts` — `JvmlStockQueryState`, `JvmlStockDialogState`
  (`{type:"none"} | {type:"view"; row: JvmlStock}`), table/toolbar/filters/pagination/view-sheet prop
  interfaces, `UseJvmlStockListResult`. (Mirror `customer-code-ui.ts` shapes; pagination prop is
  `isLoading`, table prop is `loading`.)
- `src/types/settings/jvml-stock-config.ts` — `JvmlStockConfig` (enabled, base_path, file_name,
  start_time, end_time, interval_hours, notify_emails: string[], updated_at: string|null),
  `JvmlStockConfigInput` (same minus updated_at), `JvmlStockStatus` (enabled, last_report_date,
  last_status, last_row_count, last_found_at, last_alerted_at, last_error, recent:
  `JvmlStockIngestionRow[]`), `JvmlStockIngestionRow`.
- `src/types/settings/jvml-stock-config-ui.ts` — form prop contracts + `UseJvmlStockConfigResult`.

### API
- `src/api/jvml-stock/list.ts` — `listJvmlStock(query): Promise<PaginatedResult<JvmlStock>>` via `getList`
  + `buildQuery`; strip empty/undefined (mirror `customer-codes/list.ts`); forward `dateFrom`/`dateTo`.
- `src/api/jvml-stock/options.ts` — `searchJvmlStockFieldOptions(field): (q)=>Promise<AsyncOption[]>`
  curried factory hitting `/jvml-stock/options?field=&q=&limit=20` (mirror `customer-codes/options.ts`).
- `src/api/settings/jvml-stock-config/get.ts` — `getJvmlStockConfig(): Promise<JvmlStockConfig>` (`getData`).
- `src/api/settings/jvml-stock-config/update.ts` — `updateJvmlStockConfig(body): Promise<JvmlStockConfig>`
  via `putData` (ORCHESTRATOR adds `putData` to `api/client.ts` — see §4; builder may assume it exists).
- `src/api/settings/jvml-stock-config/status.ts` — `getJvmlStockStatus(): Promise<JvmlStockStatus>`.
- `src/api/settings/jvml-stock-config/runNow.ts` — `runJvmlStockCheckNow(): Promise<JvmlStockStatus>`
  (`postData('/admin/jvml-stock/run-now', {})`).

### Components — JVML Stock List (`src/components/jvml-stock/`)
- `JvmlStockTable.tsx` — sortable server table. Visible columns: Report Date · Party Code · Customer ·
  **Customer Name** (mapped; italic "—" when null) · Sold To Party · Material · JSW Grade · Sales
  Office · Distr.Chnl · Unrestr Qty (tabular-nums) · Stock Qty · actions(view). Sort only on whitelist
  columns. Loading skeleton + empty (`Boxes` icon) + error states (mirror `CustomerCodeTable.tsx`).
- `JvmlStockTableToolbar.tsx` — inline: free-text search (`Input` w/ debounce OR `AsyncCombobox` on
  `customer` → sets `q`) + `DateRangePicker` (`dateFrom`/`dateTo`) + a `JvmlStockFilters` popover button
  (active-count badge).
- `JvmlStockFilters.tsx` — a shadcn `Popover` containing a 2-column grid of **10** `AsyncCombobox`
  filters (one per `JvmlStockField`, frozen module-level `FETCHERS` via `searchJvmlStockFieldOptions`) +
  "Clear all". Active count shown on the trigger badge.
- `JvmlStockTablePagination.tsx` — mirror `CustomerCodeTablePagination.tsx` (prop `isLoading`; label
  "stock row"/"stock rows").
- `ViewJvmlStockSheet.tsx` — shadcn `Sheet` (side right, scrollable) showing EVERY stored field grouped:
  Order & SO · Customer & Mapping · Material & Dimensions · Quantities (MT) · Quality / NCO ·
  Chemistry (%) · Mechanical · Logistics / Export · Meta. Render `—` for null; format dates with
  date-fns; `created_at`/`updated_at` as datetime. Keep ≤250 lines (use a grouped-config array +
  a generic `<Field label value>` renderer; may add a `jvml-stock-fields.ts` config under
  `src/components/jvml-stock/` if needed).
- `hooks/useJvmlStockList.ts` — owns query state {page,limit,sortBy,sortOrder,q,10 filters,dateFrom,dateTo},
  rows/meta/loading/error, dialog union, `setPage/setLimit/setSort/setSearch/setFilter/setDateRange/
  clearFilters/refetch/openDialog/closeDialog`. Race-safe `fetchIdRef`. Mirror `useCustomerCodeManagement.ts`.
- `src/pages/jvml-stock/index.tsx` — `JvmlStockListPage` (default export): header (icon chip `Boxes` +
  title "JVML Stock List" + subtitle) + toolbar + table + pagination + view sheet. Thin orchestrator.

### Components — Settings (`src/components/settings/`)
- `JvmlStockConfigCard.tsx` — the config form `Card`: header (icon + "JVML Stock Excel Configuration" +
  helper text describing `<base_path>/<dd-mm-yyyy>/<file_name>.xlsx`). Fields: `Switch` enabled; `Input`
  base_path; `Input` file_name (+ ".xlsx" hint); start/end time (`Input type="time"`); interval
  (`Select` 1..24 hours, labelled "Every 1 hour"…"Every 24 hours"); `EmailChipInput` notify_emails
  (reuse `@/components/admin/regions/EmailChipInput`). Footer: "Run check now" (secondary) + "Save
  configuration" (primary, `aria-busy`). Below: a compact status panel (enabled badge, last run
  date/status/rows, last error) from `JvmlStockStatus`. Use `Field/FieldLabel/FieldError`. Validate
  client-side (start<end, file_name no separators) + surface backend errors. A
  `JvmlStockConfigStatus.tsx` sub-component for the status panel is allowed.
- `hooks/useJvmlStockConfig.ts` — loads config + status, owns form state, `save()`, `runNow()`, loading/
  saving/error flags. Toasts via `sonner` on success/failure.
- The Settings PAGE (`src/pages/admin/settings/index.tsx`) is created/edited by the ORCHESTRATOR
  (shared with JSW session). Builders only produce `JvmlStockConfigCard` + its hook + sub-component.

## 4. Shared-file WIRING (ORCHESTRATOR only — single serialized pass, append-only, re-read first)

Backend:
1. `app/models/__init__.py` — import + `__all__` add `JvmlStock`, `JvmlStockConfig`, `JvmlStockIngestion`.
2. `app/core/database.py` — import + add the 3 models to `DOCUMENT_MODELS`.
3. `app/models/audit_log.py` — add `"jvml_stock"` to `AuditCategory` Literal.
4. `app/schemas/audit_log.py` — add `"jvml_stock"` to its `AuditCategory` Literal (keep in sync).
5. `app/services/audit_log/options.py` — add `"jvml_stock"` to `_CATEGORIES`.
6. `app/services/audit/events.py` — add `audit_jvml_stock_event`.
7. `app/core/scheduler.py` — `apply_jvml_stock_schedule()` + best-effort registration in `start_scheduler`.
8. `app/routes/__init__.py` — `from . import ... jvml_stock`; `api_router.include_router(jvml_stock.router)`
   + `api_router.include_router(jvml_stock.config_router)`.

Frontend:
9. `src/api/client.ts` — add `putData<T>(path, body)` helper (PUT → unwrap data) mirroring `patchData`
   (only if absent).
10. `src/components/layout/nav-items.ts` — add `{ label: "JVML Stock List", to: "/jvml-stock", icon: Boxes }`
    to `NAV_ITEMS` (after Dashboard); add `{ label: "Settings", to: "/admin/settings", icon: Settings }`
    to `ADMIN_NAV_ITEMS` (only if not already present). Import `Settings` icon if needed.
11. `src/App.tsx` — lazy-import + add `<Route path="/jvml-stock" element={<JvmlStockListPage/>} />` inside
    the Protected+DashboardLayout group (NOT inside AdminRoute); add `<Route path="/admin/settings"
    element={<SettingsPage/>} />` inside the AdminRoute group (only if not already present).
12. `src/pages/admin/settings/index.tsx` — create if absent (render `JvmlStockConfigCard`); if it already
    exists (JSW created it), append `<JvmlStockConfigCard />` to its card stack via surgical edit.
13. Audit Logs FE: add `"jvml_stock"` to `src/types/admin/audit-log.ts` `AuditCategory` union + a color
    mapping in `AuditCategoryBadge.tsx` (append-only).

## 5. Audit actions used
`jvml_stock.ingested` (success, extra: report_date,row_count), `jvml_stock.failed` (error),
`jvml_stock.missing_alert` (notification sent), `jvml_stock.config_updated`. `cron.jvml_stock_poll`
is auto-emitted by `@audited_job`.

## 6. Verification (Phase done when ALL pass)
- `cd backend && ./.venv/bin/python -c "import app.main"` OK (all imports resolve, models register).
- Routes present: `GET /jvml-stock`, `GET /jvml-stock/options`, `GET/PUT /admin/jvml-stock/config`,
  `GET /admin/jvml-stock/status`, `POST /admin/jvml-stock/run-now`.
- Unauth `GET /jvml-stock` → 401; non-admin `PUT /admin/jvml-stock/config` → 403/401.
- `parse_workbook(open('macro_files/JVML Stock (99).xlsx','rb').read())` returns ~3,388 rows WITHOUT
  raising — the critical correctness gate. Header maps all 72 columns.
- `coerce_value` typing: a numeric-serial `production_date` (`46065`) → datetime; `width_mm`
  `"1250.000"` stays string; numeric qty (`"21.954..."`) → float; blank/`"NA"` number → None;
  `party_code` `"0000008662"` → string, `party_code_normalized` → `"8662"`.
- `cd frontend && npm run build` (tsc -b + vite) exit 0; `npm run lint` clean on new files.
- Every new file ≤250 lines. No client-side filtering. FE query keys match BE exactly (incl. `dateFrom`/
  `dateTo` and snake_case filter keys).
- ZERO modifications to any `jsw_stock`/`jsw-stock` file or `.planning/jsw-stock/`.
