# Credit Report Domain — Build SPEC (single source of truth)

Clone of the `jvml_stock` domain, adapted to the SAP **Credit Management** report
(`macro_files/credit report.XLSX`, 33 columns). Each builder reads the named JVML
reference file and applies the deltas below. **All files ≤250 lines.**

> Reference domain to clone: `jvml_stock` (backend) / `jvml-stock` (frontend).
> When a behaviour is not mentioned as a delta, copy the JVML file verbatim with a
> mechanical `jvml`→`credit_report` / `Jvml`→`CreditReport` / `jvml-stock`→`credit-report`
> rename. **Do NOT invent a `jvml`/`jsw` orphan tree.**

## KEY DELTAS vs JVML (read carefully)

1. **33 columns, not 72.** Column map below is authoritative.
2. **No customer mapping.** The file has a native `Customer Name` column. DROP
   `customer_map.py`, `party_code_normalized`, `customer_name`(mapped), `customer_code_id`.
   `ingest.py` does NOT build a customer map and does NOT import `should_keep_row`'s
   customer_map arg.
3. **Ingestion gate** (`utils/credit_report/filters.py`): keep a row ONLY when
   `customer_name` is non-empty **AND** `credit_control_area ∈ {"JV0H","VJ0H"}` (case-insensitive).
4. **List filters: the 6 the user asked for** — 4 async-select
   (`customer_name`, `city`, `customer`, `cca_description`) + `blocked` enum
   (`blocked`/`unblocked`) + `credit_balance_sign` enum (`positive`/`negative`).
   Plus optional `date` (report_date exact) param for parity (FE does not send it).
5. **Frontend toolbar** renders the 6 filters cleanly (4 AsyncCombobox + 2 Select +
   Clear). NO free-text `q`, NO DateRangePicker (the JVML FE has FE/BE drift — do NOT
   copy that; build a clean contract that matches this SPEC's backend exactly).
6. **Financial formatting**: negative numbers red, positive emerald (credit_balance,
   credit_exposure, overdue). Indian grouping via `toLocaleString("en-IN")`.
7. **Audit category** = `credit_report` (singular, like `jsw_stock`).

---

## §1 Column map  (`backend/app/utils/credit_report/columns.py`)

Clone `utils/jvml_stock/columns.py` structure (normalize_header, HEADER_TO_FIELD,
FIELD_TYPES, TEXT/NUMBER/DATE_FIELDS, excel_serial_to_datetime, coerce_value — ALL
verbatim). Replace only the `COLUMNS` list and the `assert len == 33`.

```python
COLUMNS: list[tuple[str, str, str]] = [
    ("Customer Name",              "customer_name",              "text"),
    ("City",                       "city",                       "text"),
    ("Customer",                   "customer",                   "text"),
    ("Credit control area",        "credit_control_area",        "text"),
    ("CCA Description",            "cca_description",            "text"),
    ("Blocked",                    "blocked",                    "text"),
    ("Currency",                   "currency",                   "text"),
    ("CCA Credit Limit",          "cca_credit_limit",           "number"),
    ("Credit Proposal number",     "credit_proposal_number",     "text"),
    ("Proposed Value",            "proposed_value",             "number"),
    ("Credit Exposure",           "credit_exposure",            "number"),
    ("Credit Balance",            "credit_balance",             "number"),
    ("Overdue",                    "overdue",                    "number"),
    ("Sales value",               "sales_value",                "number"),
    ("Total receivables",         "total_receivables",          "number"),
    ("Special liabilities",       "special_liabilities",        "number"),
    ("Open delivery credit",       "open_delivery_credit",       "number"),
    ("Open bill.doc.credit",       "open_bill_doc_credit",       "number"),
    ("Open orders credit",         "open_orders_credit",         "number"),
    ("Guaranteed open delivery",   "guaranteed_open_delivery",   "number"),
    ("Guarantd open billing docs", "guarantd_open_billing_docs", "number"),
    ("Guaranteed open orders",     "guaranteed_open_orders",     "number"),
    ("Validity Per. Start",        "validity_period_start",      "date"),
    ("Validity Period End",        "validity_period_end",        "date"),
    ("Risk category",             "risk_category",              "text"),
    ("Total amount",              "total_amount",               "number"),
    ("Individual limit",          "individual_limit",           "number"),
    ("Sales Organization",        "sales_organization",         "text"),
    ("Distribution Channel",      "distribution_channel",       "text"),
    ("Division",                   "division",                   "text"),
    ("Sales Group",               "sales_group",                "text"),
    ("Sales Office",              "sales_office",               "text"),
    ("Hierarchy Customer",        "hierarchy_customer",         "text"),
]
assert len(COLUMNS) == 33, f"Expected 33 columns, got {len(COLUMNS)}"
```

Notes: `blocked` is **text** ("X" or None). `validity_period_end` can be the Excel
error string `#VALUE!` → `coerce_value` date path returns `None` (handled, no special-case).
Excel serial dates → datetime via the unchanged helper.

## §2 Excel parser  (`backend/app/utils/credit_report/excel.py`)

Verbatim clone of `utils/jvml_stock/excel.py` (it's generic; only the
`from .columns import HEADER_TO_FIELD` import binds it to this domain). No changes
beyond the module docstring. **Verified working on `credit report.XLSX`** (196 xml
rows, 33 headers, `#VALUE!` arrives as a shared string).

## §3 Ingestion gate  (`backend/app/utils/credit_report/filters.py`)

```python
from __future__ import annotations
from typing import Any

_ALLOWED_CCA = frozenset({"JV0H", "VJ0H"})

def should_keep_row(coerced: dict[str, Any]) -> bool:
    """Keep a credit-report row only when it has a customer name AND its
    Credit Control Area is one of the two we ingest (JV0H / VJ0H)."""
    name = (coerced.get("customer_name") or "")
    if not str(name).strip():
        return False
    cca = (coerced.get("credit_control_area") or "").strip().upper()
    return cca in _ALLOWED_CCA
```

## §4 Query builder  (`backend/app/utils/credit_report/query.py`)

```python
from __future__ import annotations
from typing import Any
from ...schemas.credit_report import CreditReportListQuery

_FILTER_FIELDS = ("customer_name", "city", "customer", "cca_description")

def build_credit_report_filter(query: CreditReportListQuery) -> dict[str, Any]:
    filt: dict[str, Any] = {}
    if query.date:
        filt["report_date"] = query.date
    for field in _FILTER_FIELDS:
        v = getattr(query, field, None)
        if v is not None:
            filt[field] = v
    if query.blocked == "blocked":
        filt["blocked"] = "X"
    elif query.blocked == "unblocked":
        filt["blocked"] = {"$in": [None, ""]}
    if query.credit_balance_sign == "negative":
        filt["credit_balance"] = {"$lt": 0}
    elif query.credit_balance_sign == "positive":
        filt["credit_balance"] = {"$gte": 0}
    return filt

def build_sort(sort_by: str, sort_order: str) -> str:
    prefix = "+" if sort_order == "asc" else "-"
    return f"{prefix}{sort_by}"
```

## §5 Model  (`backend/app/models/credit_report.py`, collection `credit_report`)

Clone `models/jvml_stock.py` shape. Fields = the 33 columns (types: text→`str|None`,
number→`float|None`, date→`datetime|None`) + meta fields. **Indexed** (`Annotated[... , Indexed()]`):
`customer_name, city, customer, credit_control_area, cca_description, blocked,
credit_balance, report_date, created_at`. All other columns plain `… | None = None`.
Meta fields (NO party_code_normalized / customer_code_id mapping fields):
```python
report_date: Annotated[str, Indexed()]
source_file: str | None = None
created_at: Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
updated_at: datetime = Field(default_factory=_now_utc)
class Settings: name = "credit_report"
```

## §6 Config + Ingestion models

- `models/credit_report_config.py` — verbatim clone of `jvml_stock_config.py`;
  `class Settings: name = "credit_report_configs"`.
- `models/credit_report_ingestion.py` — verbatim clone of `jvml_stock_ingestion.py`;
  `class Settings: name = "credit_report_ingestions"`.

## §7 Schemas

### `schemas/credit_report.py` (clone of `schemas/jvml_stock.py`)
```python
CreditReportSortBy = Literal[
    "created_at", "report_date", "customer_name", "city", "customer",
    "credit_control_area", "cca_description", "blocked", "cca_credit_limit",
    "credit_exposure", "credit_balance", "overdue", "total_receivables",
]
CreditReportField = Literal["customer_name", "city", "customer", "cca_description"]

class CreditReportListQuery(PageQuery):
    sortBy: CreditReportSortBy = "created_at"
    date: str | None = Field(default=None, pattern=r"^\d{2}-\d{2}-\d{4}$")
    customer_name: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=200)
    customer: str | None = Field(default=None, max_length=200)
    cca_description: str | None = Field(default=None, max_length=200)
    blocked: Literal["blocked", "unblocked"] | None = None
    credit_balance_sign: Literal["positive", "negative"] | None = None

class CreditReportOptionsQuery(BaseModel):
    field: CreditReportField
    q: str | None = Field(default=None, max_length=200)
    limit: int = Field(default=20, ge=1, le=50)
```
Re-export `AsyncOption` from `.admin_user` like JVML does.

### `schemas/credit_report_config.py` — verbatim clone of `jvml_stock_config.py`
Rename `Jvml`→`CreditReport` only. Same validators (HHMM, file_name denylist
`/ \ ..`, email normalize, start<end). Classes: `CreditReportConfigPublic`,
`CreditReportConfigUpdate`, `CreditReportIngestionRow`, `CreditReportStatusPublic`.

### `schemas/credit_report_record.py` — public DTO with all 33 cols + meta
Clone `jvml_stock_record.py` structure. Fields: `id: str` + the 33 columns
(text→`str|None`, number→`float|None`, date(`validity_period_start`,
`validity_period_end`)→`datetime|None`) + `report_date: str`, `source_file: str|None`,
`created_at: datetime`, `updated_at: datetime`. Class: `CreditReportPublic`.
NO party_code_normalized / customer_name(mapped) / customer_code_id fields.

## §8 Services  (`backend/app/services/credit_report/`)

- `__init__.py` — empty package marker (clone jvml's).
- `serialize.py` — `to_credit_report_public(doc) -> CreditReportPublic`; map `id=str(doc.id)`
  + all 33 columns + 4 meta fields. NO mapping fields.
- `list.py` — clone `jvml_stock/list.py`; uses `build_credit_report_filter`,
  `to_credit_report_public`, `CreditReportPublic`, `CreditReport`.
- `options.py` — clone `jvml_stock/options.py`; `CreditReport.distinct(field, filt)`;
  whitelist is the 4 `CreditReportField` values.
- `ingest.py` — clone `jvml_stock/ingest.py` BUT: remove party-code/customer_map logic.
  Flow: read bytes → `parse_workbook` → `await CreditReport.find({"report_date": report_date}).delete()`
  → for each row: `coerced = {field: coerce_value(field, row.get(field)) for _,field,_ in COLUMNS}`;
  `if not should_keep_row(coerced): continue`; append `CreditReport(**coerced, report_date=..., source_file=path, created_at=now, updated_at=now)`.
  Chunked insert_many (1000). Emit `audit_credit_report_event("credit_report.ingested", ...)`.
  `should_keep_row(coerced)` takes ONE arg.
- `emails.py` — clone `jvml_stock/emails.py`; rename audit action to
  `credit_report.missing_alert`; alert noun "CREDIT REPORT EXCEL"; helper
  `audit_credit_report_event`.
- `config_service.py` — clone `jvml_stock/config_service.py`; local import
  `from ...core.scheduler import apply_credit_report_schedule`; audit action
  `credit_report.config_updated`; uses `CreditReportConfig`.
- `status.py` — clone `jvml_stock/status.py`; uses `CreditReportConfig`,
  `CreditReportIngestion`, `CreditReportIngestionRow`, `CreditReportStatusPublic`.
- `poller.py` — clone `jvml_stock/poller.py`; uses `CreditReportIngestion`,
  `CreditReportStatusPublic`, local `get_config/get_status/ingest_file/send_missing_alert`;
  audit action `credit_report.failed` on error.

## §9 Cron  (`backend/app/services/cron/credit_report.py`)
```python
from ..cron import audited_job
@audited_job("cron.credit_report_poll")
async def credit_report_poll_job() -> None:
    from ...services.credit_report.poller import run_poll  # noqa: PLC0415
    await run_poll()
```

## §10 Controllers + Routes
- `controllers/credit_report.py` — clone `controllers/jvml_stock.py`.
  `_ALLOWED_LIST_KEYS = {"page","limit","sortBy","sortOrder","date","customer_name",
  "city","customer","cca_description","blocked","credit_balance_sign"}` (11).
  `_ALLOWED_OPTION_KEYS = {"field","q","limit"}`.
- `controllers/credit_report_config.py` — clone `controllers/jvml_stock_config.py`.
- `routes/credit_report.py` — clone `routes/jvml_stock.py`; `router` prefix
  `/credit-report` (`get_current_user`), `config_router` prefix `/admin/credit-report`
  (`get_current_admin`). Endpoints: GET ``"" `` (list), GET `/options`, GET/PUT
  `/config`, GET `/status`, POST `/run-now`.

---

## FRONTEND  (`frontend/src/...`)

### Types
- `types/credit-report/credit-report.ts`: `CreditReportSortBy` (= §7 list),
  `CreditReportField = "customer_name"|"city"|"customer"|"cca_description"`,
  `CreditReport` interface (id + 33 cols: text→`string|null`, number→`number|null`,
  date(`validity_period_start`/`validity_period_end`)→`string|null` + `report_date: string`,
  `source_file: string|null`, `created_at: string`, `updated_at: string`),
  `CreditReportListQuery extends PageQuery` (sortBy, date?, customer_name?, city?,
  customer?, cca_description?, blocked?: "blocked"|"unblocked", credit_balance_sign?:
  "positive"|"negative").
- `types/credit-report/credit-report-ui.ts`: `CreditReportQueryState` =
  `{page,limit,sortBy,sortOrder, customer_name:string, city:string, customer:string,
  cca_description:string, blocked: ""|"blocked"|"unblocked",
  credit_balance_sign: ""|"positive"|"negative"}`; `CreditReportDialogState`
  (`none` | `view`); `CreditReportTableProps` (`loading`), `CreditReportTablePaginationProps`
  (`isLoading`), `CreditReportToolbarProps`, `CreditReportFiltersProps`,
  `ViewCreditReportDialogProps`, `UseCreditReportListResult`.
- `types/settings/credit-report-config.ts` + `-ui.ts`: clone of
  `types/settings/jvml-stock-config{,-ui}.ts` (Jvml→CreditReport rename only).

### API
- `api/credit-report/list.ts`: clone `api/jvml-stock/list.ts`; buildParams forwards
  page/limit/sortBy/sortOrder + (when truthy) date, customer_name, city, customer,
  cca_description, blocked, credit_balance_sign. NO q/dateFrom/dateTo.
- `api/credit-report/options.ts`: clone `api/jvml-stock/options.ts`; `/credit-report/options`.
- `api/settings/credit-report-config/{get,update,status,runNow}.ts`: clone the four
  `api/settings/jvml-stock-config/*` files; paths `/admin/credit-report/{config,status,run-now}`.

### Components  (`components/credit-report/`)
- `hooks/useCreditReportList.ts`: clone `useJvmlStockList.ts` shape (query state, race-safe
  doFetch, setPage/setLimit/setSort/setFilter/clearFilters/refetch/openDialog/closeDialog).
  DEFAULT_QUERY has the 6 filters as "" and NO q/dateFrom/dateTo. NO todayRange seeding
  (show all; default sort created_at desc). `setFilter(patch)` covers all 6 filter keys
  (the 4 async + blocked + credit_balance_sign). NO setSearch/setDateRange.
- `credit-report-fields.ts`: `CREDIT_REPORT_FIELD_GROUPS` (like jvml-stock-fields.ts) — 33
  cols + meta in logical groups: "Customer" (customer_name, city, customer,
  credit_control_area, cca_description, blocked, currency), "Credit Limits & Exposure"
  (cca_credit_limit, credit_exposure, credit_balance, overdue, proposed_value,
  credit_proposal_number, total_amount, individual_limit), "Receivables & Liabilities"
  (sales_value, total_receivables, special_liabilities, open_delivery_credit,
  open_bill_doc_credit, open_orders_credit, guaranteed_open_delivery,
  guarantd_open_billing_docs, guaranteed_open_orders), "Validity & Risk"
  (validity_period_start[date], validity_period_end[date], risk_category),
  "Sales Org" (sales_organization, distribution_channel, division, sales_group,
  sales_office, hierarchy_customer), "Meta" (report_date[text], source_file[text],
  created_at[datetime], updated_at[datetime]). Number cols use kind "money" (new) or
  "number"; financial money cols use kind "money".
- `CreditReportTable.tsx`: clone `JvmlStockTable.tsx`. Columns: Report Date · Customer ·
  Customer Name · City · CCA (credit_control_area) · CCA Description · Blocked (badge) ·
  Credit Limit (cca_credit_limit) · Credit Exposure · Credit Balance · Overdue · view.
  Money cols right-aligned tabular-nums; `credit_balance` & `credit_exposure` colored:
  `< 0` → `text-destructive`, `> 0` → `text-emerald-600 dark:text-emerald-400`, `0`/null
  → muted. Blocked: if `=== "X"` show `<Badge variant="destructive">Blocked</Badge>` else "—".
  Use a shared `fmtINR(n)` helper: `n.toLocaleString("en-IN", {maximumFractionDigits: 2})`
  prefixed `₹`, em-dash for null.
- `CreditReportFilters.tsx`: 4 `AsyncCombobox` (customer_name, city, customer,
  cca_description) via `searchCreditReportFieldOptions(field)` (FETCHERS frozen at module
  scope) + 2 shadcn `Select` — Blocked (All / Blocked / Not blocked → "","blocked","unblocked")
  and Credit Balance (All / Positive / Negative → "","positive","negative") + a "Clear (N)"
  ghost button when any active. Flat fragment flowing inline (like JvmlStockFilters).
  Props per `CreditReportFiltersProps`.
- `CreditReportTableToolbar.tsx`: wrapping flex row (`role="toolbar"`) rendering
  `<CreditReportFilters .../>`. NO search box, NO date-range.
- `CreditReportTablePagination.tsx`: clone `JvmlStockTablePagination.tsx` (rename only).
- `ViewCreditReportDialog.tsx`: clone `ViewJvmlStockDialog.tsx`; header title =
  `customer_name || customer`; subtitle = `[credit_control_area, cca_description].join(" · ")`;
  badges: report_date, credit_control_area, blocked→destructive "Blocked", and a
  credit_balance badge (green/red). Body driven by `CREDIT_REPORT_FIELD_GROUPS`; add a
  "money" kind to FieldCell that renders `fmtINR` with sign color.

### Page
- `pages/credit-report/index.tsx`: clone `pages/jvml-stock/index.tsx`; header icon
  `CreditCard` (lucide), title "Credit Report", subtitle "SAP credit management —
  JV0H / VJ0H control areas". Renders Toolbar + Table + Pagination + ViewDialog. Adapter
  maps toolbar `onQueryChange` to `setFilter` for the 6 filter keys + setPage/setLimit;
  sort adapter toggles order.

### Settings card
- `components/settings/hooks/useCreditReportConfig.ts`: clone `useJvmlStockConfig.ts`
  (rename, point at `api/settings/credit-report-config/*`).
- `components/settings/CreditReportConfigCard.tsx`: clone `JvmlStockConfigCard.tsx`;
  `const ctl = useCreditReportConfig(); return <StockConfigPanel domain={CREDIT_REPORT_DOMAIN} ctl={ctl} />`.

---

## SHARED-FILE WIRING (orchestrator does these by hand — builders MUST NOT touch them)
Backend: `models/__init__.py`, `core/database.py` (DOCUMENT_MODELS), `core/scheduler.py`
(`CREDIT_REPORT_JOB_ID="credit_report.poll"`, `CREDIT_REPORT_DEADLINE_JOB_ID=
"credit_report.deadline"`, `apply_credit_report_schedule()`, boot-register block),
`services/cron/__init__.py`, `services/audit/events.py` (`audit_credit_report_event`,
category `credit_report`), `models/audit_log.py` + `schemas/audit_log.py` (add
`"credit_report"` to `AuditCategory`), `services/audit_log/options.py` (`_CATEGORIES`),
`middleware/audit.py` (`("/admin/credit-report","credit_report")`,
`("/credit-report","credit_report")` BEFORE the `/admin` fallback), `routes/__init__.py`.
Frontend: `components/settings/config-domains.ts` (`CREDIT_REPORT_DOMAIN`),
`components/settings/types.ts` (extend `key` union with `"credit_report"`),
`pages/admin/settings/index.tsx` (3rd card + grid `xl:grid-cols-3`),
`components/layout/nav-items.ts` (NAV_ITEMS: Credit Report `/credit-report` `CreditCard`),
`App.tsx` (route), `types/admin/audit-log.ts` (+`credit_report`),
`components/admin/audit-logs/AuditCategoryBadge.tsx` (violet mapping).
