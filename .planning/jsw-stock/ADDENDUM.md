# JSW Stock Build — ADDENDUM

> Consolidated reference for all build agents. Read this alongside `SPEC.md` —
> this file wins on any conflict. Every item is evidence-backed from the 12
> pre-flight area agents that ran live venv / file checks on 2026-05-31.
>
> Rule: every file ≤ 250 lines. No client-side filtering. FE query keys are
> snake_case matching BE exactly.

---

## Part A — SPEC Corrections and Clarifications

### A-BE (Backend)

#### BE-1 · `lc_exp_date` is `str | None` — NOT `datetime | None`

SPEC §1 marks `LC Exp Date` (col 70) as `type=text`. The backend model field is
`lc_exp_date: str | None = None`. SAP stores this as a verbatim `dd.mm.yyyy`
string — do not apply date coercion. The `coerce_value` text branch strips and
returns it as-is. The frontend type is `string | null`.

#### BE-2 · Text-typed columns that look numeric

These fields are `str | None` in the model and `string | null` in the frontend,
because their SAP source stores them as text (confirmed by macro_doc):

| # | field | reason |
|---|-------|--------|
| 47 | `elongation` | 0.1% fill, stored as text |
| 49 | `hardness` | stored as text with leading spaces |
| 65 | `yield_strength` | macro_doc: "STORED AS TEXT" |
| 66 | `uts` | macro_doc: "STORED AS TEXT" |
| 12 | `act_thickness_mm` | type=text per SPEC §1 |
| 13 | `width_mm` | type=text per SPEC §1 |
| 22 | `length_mm` | type=text per SPEC §1 |

#### BE-3 · `recieving_point` is a deliberate sic spelling

Column 39 header in the real Excel file is `RECIEVING POINT` (not RECEIVING).
`HEADER_TO_FIELD` uses the normalized misspelling as its key. The Python field
`recieving_point` matches the Excel header exactly. Do not "fix" this.

#### BE-4 · `updated_at` in `JswStock` is NOT indexed

SPEC §1 indexed list: the 12 filter fields + `party_code_normalized` +
`customer_name` + `customer_code_id` + `report_date` + `created_at` = 17 total.
`updated_at` is NOT in this list. Do not add `Indexed()` to `updated_at`.

#### BE-5 · `status` in `JswStockIngestion` is plain `str` in the model

`Literal["pending", "ingested", "missing", "alerted", "error"]` belongs in the
schema/validator layer only (consistent with how `AuditLog.category` and
`AuditLog.outcome` are typed). The model stores `status: str = "pending"`.

#### BE-6 · The `"1.057.000"` malformed cell is in `tensile_strength_mpa_b`, not `width_mm`

SPEC §1 and `macro_docs/zsd-currstk-hr.md` both say the malformed cell is in
`"Width (mm)"`. **This is wrong.** Live parser run confirmed:

- `Width (mm)` (col M, 0-based index 12) is entirely shared-string backed — all
  17 324 values are `str`, zero malformed cells.
- The actual malformed cells are in column **BL** (0-based index 63 =
  `tensile_strength_mpa_b`, type `number`), at data rows 578 and 13 571 plus
  ~10 more rows with `"1.018.000"` etc.

Correct SPEC §6 verification gate interpretation:

- The **raw-zip parser** returns `"1.057.000"` as a Python `str` (malformed-cell
  guard in the numeric branch: `float(v) fails → return raw_v`).
- After `coerce_value`, because `tensile_strength_mpa_b` is type `number`,
  `float("1.057.000")` fails → stored as `None` in MongoDB.
- SPEC gate "the `1.057.000` cell stays a string" is true at the parse layer;
  `None` at the stored-document layer. Both behaviors are correct.

No special-casing is needed in the builder — the existing parser logic handles it.

#### BE-7 · `dateFrom` / `dateTo` are `datetime | None` in the schema — NOT `str | None`

SPEC §2 says `dateFrom: str|None` parsed via `datetime.fromisoformat` inside
`query.py`. **Use `datetime | None = None` directly in `JswStockListQuery`.**

Pydantic v2 with Python 3.13 parses ISO-8601 strings (including trailing `Z`)
into `datetime` objects automatically. Confirmed live: `'2025-01-15T00:00:00Z'`
→ `datetime(2025, 1, 15, tzinfo=UTC)`. `query.py` receives ready-made `datetime`
objects — no manual `fromisoformat` call. Mirror the `audit_log` domain pattern.

```python
# schemas/jsw_stock.py — correct
dateFrom: datetime | None = None
dateTo: datetime | None = None
```

#### BE-8 · Beanie 2.1.0 `distinct` — filter is 2nd positional arg, NOT keyword

```python
# CORRECT
values = await JswStock.distinct(query.field, filt)

# WRONG — raises TypeError
values = await JswStock.distinct(query.field, filter=filt)
```

Confirmed via introspection: `distinct(key: str, filter: Mapping[str,Any] | None = None, session: ...) -> list`.
`FindMany.distinct` does NOT exist — `distinct` is a `Document` classmethod only.

#### BE-9 · `insert_many` count tracking — use `len(chunk)`, not `InsertManyResult`

`InsertManyResult.inserted_ids` is unreliable when `ordered=False`. Track count
by summing `len(chunk)` at each call site:

```python
inserted = 0
for i in range(0, len(docs), _CHUNK_SIZE):
    chunk = docs[i : i + _CHUNK_SIZE]
    await JswStock.insert_many(chunk)
    inserted += len(chunk)
```

#### BE-10 · `find().delete()` — single `await` is correct

`FindMany.delete()` returns `DeleteMany` which implements `__await__`. One
`await` is correct; `await await` is wrong.

```python
await JswStock.find({"report_date": report_date}).delete()  # correct
```

#### BE-11 · APScheduler `remove_job` raises `JobLookupError` — always guard

`sched.get_job("id")` returns `None` safely if the job is absent.
`sched.remove_job("id")` raises `JobLookupError` if absent.

```python
# CORRECT
if sched.get_job(JSW_STOCK_JOB_ID) is not None:
    sched.remove_job(JSW_STOCK_JOB_ID)
```

#### BE-12 · `PUT` is missing from `allow_methods` in `app/main.py`

`app/main.py` CORS config has `allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"]`.
The wiring agent must add `"PUT"` — the `PUT /admin/jsw-stock/config` route will
fail CORS preflight without it.

#### BE-13 · Audit category is `"jsw_stock"` (singular, underscore)

`audit_jsw_stock_event` must pass `category="jsw_stock"`. This is singular,
unlike the pre-existing `"regions"` (plural) and `"customer_codes"` (plural) —
that inconsistency is pre-existing and must not be "corrected".

#### BE-14 · `datetime.now()` (no timezone) is correct in `poller.py`

Config `start_time`/`end_time` are local-clock HH:MM strings. The poll window
comparison uses `datetime.now()` (local clock). Do not substitute `datetime.now(timezone.utc)`.

#### BE-15 · `apply_jsw_stock_schedule` must use a local import (circular import chain)

The import chain `scheduler.py → services.cron.jsw_stock → services.jsw_stock.poller →
services.jsw_stock.config_service → scheduler.py` creates a circular import.
Both `apply_jsw_stock_schedule` in `scheduler.py` and the boot-registration block
in `start_scheduler` must use local imports inside the function body:

```python
async def apply_jsw_stock_schedule() -> None:
    sched = get_scheduler()
    if sched is None:
        return
    try:
        from apscheduler.triggers.interval import IntervalTrigger  # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job    # noqa: PLC0415
        from ..models.jsw_stock_config import JswStockConfig        # noqa: PLC0415
        ...
    except Exception:
        logger.warning("apply_jsw_stock_schedule failed.", exc_info=True)
```

#### BE-16 · DB must be initialized before `start_scheduler` at boot

`start_scheduler` now `await`s `JswStockConfig.find_one(...)` during boot
registration. Verify `init_db(app)` (or equivalent) is called **before**
`start_scheduler()` in `app/main.py`'s lifespan handler. If the order is
currently startup → scheduler → DB, swap it.

#### BE-17 · `JswStockConfigPublic` has no `id` field

The singleton config has no client-facing ID. Do not add `id: str` to
`JswStockConfigPublic`. The SPEC omission is intentional.

#### BE-18 · `notify_emails` validator order in `JswStockConfigUpdate`

The `mode="before"` normalizer (lowercase + deduplicate) must run before Pydantic
validates the `EmailStr` type. This is correct because `field_validator` with
`mode="before"` runs before type coercion. Mirror `schemas/region.py` exactly.

#### BE-19 · Beanie `find_one` sort syntax

Use the pymongo-style tuple list that the reference `customer_code` domain uses:

```python
latest = await JswStockIngestion.find_one(sort=[("created_at", -1)])
```

If Beanie 2.1.0 requires the fluent form, use:
```python
latest = await JswStockIngestion.find().sort("-created_at").first_or_none()
```

Verify against the live `customer_code` reference in the venv.

#### BE-20 · `AuditCategory` Literal must be updated in TWO places

Both files must stay in sync:
- `app/models/audit_log.py` line ~17
- `app/schemas/audit_log.py` line ~22
- `app/services/audit_log/options.py` `_CATEGORIES` list

All three currently end at `"customer_codes"`. All three need `"jsw_stock"` appended.

#### BE-21 · `AsyncOption` import source is `schemas.admin_user`

```python
from ...schemas.admin_user import AsyncOption  # correct
# NOT from schemas.audit_log (has a local copy with same shape but wrong source)
# NOT redefined in schemas/jsw_stock.py
```

#### BE-22 · `file_name` path-traversal guard in `JswStockConfigUpdate`

Reject `file_name` values containing `/`, `\\`, or `..`. Exact validator:

```python
@field_validator("file_name", mode="before")
@classmethod
def validate_file_name(cls, v: Any) -> str:
    v = str(v).strip() if v else ""
    if any(c in v for c in ("/", "\\", "..")):
        raise ValueError("file_name must not contain / \\ or ..")
    return v
```

---

### A-FE (Frontend)

#### FE-1 · `putData` is missing from `api/client.ts` — must be added by wiring pass

`patchData` exists (PATCH). `putData` (PUT) does not. The wiring agent adds it:

```typescript
/** PUT a JSON body and unwrap `data`. */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}
```

Insert after `patchData`, before `deleteData`. Stock-list and settings builders
must NOT add this — it is wiring-pass scope only.

#### FE-2 · `buildQuery` skips `undefined` and `""` but NOT `null`

`buildQuery` in `api/client.ts` strips only `undefined` and empty string. When
passing date-range values: always coerce `null → undefined` before forwarding.

```typescript
// WRONG — null serialises as the string "null"
buildQuery({ dateFrom: null })

// CORRECT
buildQuery({ ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}) })
```

Also applies to `DateRangePicker.onChange`: the picker emits
`{from: string|null, to: string|null}`. Map `null → undefined` at the toolbar.

#### FE-3 · Table prop is `loading`, pagination prop is `isLoading` — exact asymmetry

```typescript
// JswStockTableProps
loading: boolean      // NOT isLoading

// JswStockTablePaginationProps
isLoading: boolean    // NOT loading
```

This matches the established `CustomerCodeTable` / `CustomerCodeTablePagination`
convention. Do not swap.

#### FE-4 · `JswStockDialogState` field is `row`, not `customerCode`

```typescript
type JswStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JswStock }  // "row" — not "customerCode"
```

No create/edit/delete variants — this is a read-only list.

#### FE-5 · `JswStockListQuery` must include explicit `sortBy?: JswStockSortBy`

The SPEC implies this via the `JswStockSortBy` definition but does not spell it
out in the query interface. Add it explicitly.

#### FE-6 · `ViewJswStockSheet` requires `jsw-stock-fields.ts` — mandatory, not optional

With 79 total fields (72 + 7 meta), `ViewJswStockSheet` would be ~380 lines
without a config-driven renderer. `jsw-stock-fields.ts` (a data-only config
array, no React imports) is mandatory to keep the sheet under 250 lines.
Estimated breakdown with config: sheet ~110 lines, config ~130 lines.

#### FE-7 · `JswStockFilters` uses a Popover — 12 inline fields would overflow the toolbar

`CustomerCodeFilters` is inline (fragment). `JswStockFilters` is different: 12
fields use a Popover with an active-count Badge trigger. The SPEC Popover design
is correct for this domain.

#### FE-8 · `/jsw-stock` is NOT inside `AdminRoute`

`/jsw-stock` goes inside `<ProtectedRoute>/<DashboardLayout>` but OUTSIDE
`<AdminRoute>`. All authenticated users can view it. `/admin/settings` goes
inside `<AdminRoute>`.

#### FE-9 · `JswStockConfigCard` has no props — it owns `useJswStockConfig()` internally

`SettingsPage` renders `<JswStockConfigCard />` with zero props. The hook is
encapsulated. `JswStockConfigCardProps` (from the SPEC's types file) can be
reduced to just `JswStockConfigStatusProps` and `UseJswStockConfigResult`.

#### FE-10 · `Select` controlled value is on the `<Select>` root, not `<SelectTrigger>`

```typescript
// CORRECT
<Select value={String(form.interval_hours)} onValueChange={(v) => patch({ interval_hours: Number(v) })}>
  <SelectTrigger className="w-full">...</SelectTrigger>
  ...
</Select>

// WRONG — value on SelectTrigger is ignored by Radix
<SelectTrigger value={...}>
```

#### FE-11 · `FETCHERS` and `INTERVAL_OPTIONS` must be at module scope, not inside components

```typescript
// CORRECT — module scope
const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchJswStockFieldOptions(field)])
) as Record<JswStockField, (q: string) => Promise<AsyncOption[]>>

const INTERVAL_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: n === 1 ? "Every 1 hour" : `Every ${n} hours` }
})
```

Declaring these inside component functions causes re-creation on every render.
`FETCHERS` inside a component would cause `AsyncCombobox`'s `useAsyncOptions` to
see a new function reference on every render and re-fetch spuriously.

#### FE-12 · FILE_NAME_RE in the FE settings card

```typescript
const FILE_NAME_RE = /^[A-Za-z0-9_\-]+$/
```

Test the trimmed value. Empty string is caught by the "required" check first.
This matches the backend's path-traversal guard more precisely than a looser
separator check.

#### FE-13 · `clearFilters` must also reset `dateFrom` / `dateTo` to `null`

```typescript
const clearFilters = useCallback(() => {
  const cleared = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) as ...
  setQuery((q) => ({ ...q, ...cleared, dateFrom: null, dateTo: null, page: 1 }))
}, [])
```

#### FE-14 · `AsyncOption` import path is `@/types/admin/options`

```typescript
import type { AsyncOption } from "@/types/admin/options"
// NOT from customer-code.ts
// NOT from audit-log.ts
```

#### FE-15 · Named exports for page components — no default exports

All existing admin pages use named exports (`export function UserManagementPage`).
The JSW Stock pages must also use named exports:

```typescript
export function JswStockListPage() { ... }
export function SettingsPage() { ... }
```

`App.tsx` imports: `import { JswStockListPage } from "@/pages/jsw-stock"`.

#### FE-16 · `AuditCategoryBadge` CATEGORY_MAP is NOT type-safe for exhaustiveness

`CATEGORY_MAP` is typed `as const satisfies Record<string, {...}>`, not
`Record<AuditCategory, {...}>`. TypeScript will NOT warn if `jsw_stock` is
missing. The wiring agent must add the entry manually:

```typescript
jsw_stock: {
  label: "JSW Stock",
  className:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400",
},
```

---

## Part B — Confirmed Gotchas

### B-1 · Raw-zip parser: verified 17 324 rows, no exception

The `parse_workbook` prototype was run against the real file
`macro_files/ZSD_CURRSTK_HR.xlsx`. Confirmed:

- Sheet path: `xl/worksheets/sheet1.xml` (no `sheet2`)
- Shared strings: 38 462 entries
- Data rows: 17 324
- `float("1.057.000")` raises `ValueError` in the numeric branch → raw string
  `"1.057.000"` is kept → `coerce_value` for `number` type → returns `None`
- Malformed cells at BL578 and BL13571 (plus ~10 more similar)

Verification gate:
```bash
cd /DATA/CODE_FILES/MARKETING\ REPORT\ AUTOMATION
backend/.venv/bin/python -c "
from backend.app.utils.jsw_stock.excel import parse_workbook
rows = parse_workbook(open('macro_files/ZSD_CURRSTK_HR.xlsx','rb').read())
assert len(rows) == 17324, f'Expected 17324, got {len(rows)}'
print('PASS:', len(rows), 'rows')
"
```

### B-2 · `elem.clear()` in iterparse is mandatory

The sheet XML is ~35 MB. Without `elem.clear()` after each `"end"` event,
iterparse builds a full DOM (~350 MB). With `elem.clear()`, memory stays ~50 MB.

```python
# at the END of the event loop body
elem.clear()
```

### B-3 · `inlineStr` cell handling — concatenate multiple `<t>` children

```python
elif tag == "t" and cur_type == "inlineStr":
    if cur_ref:
        ci = _col_index(cur_ref)
        cur_row[ci] = str(cur_row.get(ci, "")) + (elem.text or "")
```

Not observed in this file but required for correctness with other SAP exports.

### B-4 · Beanie 2.1.0 API signatures (confirmed live)

```python
# Document.insert_many — async, returns InsertManyResult
await JswStock.insert_many(chunk)   # count = len(chunk)

# Document.distinct — filter is 2nd positional arg
await JswStock.distinct("party_code", filt)   # NOT distinct(..., filter=filt)

# FindMany.delete — single await
await JswStock.find({"report_date": today}).delete()

# Scheduler.get_job — safe, returns None if missing
job = sched.get_job("jsw_stock.poll")

# Scheduler.remove_job — RAISES JobLookupError if missing
if sched.get_job("jsw_stock.poll"):
    sched.remove_job("jsw_stock.poll")
```

### B-5 · APScheduler 3.11.2 `add_job` key params

```python
sched.add_job(
    jsw_stock_poll_job,
    trigger=IntervalTrigger(hours=cfg.interval_hours),
    id="jsw_stock.poll",
    name="JSW Stock Excel poller",
    replace_existing=True,            # replaces same id if exists
    misfire_grace_time=300,           # seconds
    next_run_time=datetime.now(),     # fires immediately on registration
)
```

`JSW_STOCK_JOB_ID = "jsw_stock.poll"` — use this constant everywhere to prevent
typo drift.

### B-6 · Column casing traps (confirmed correct per macro_doc)

These are NOT typos — they match the real Excel headers:

| Col | Header | Notes |
|-----|--------|-------|
| 3 | `"Distr.Chnl"` | period, no space |
| 12 | `"Act.Thickness (mm)"` | period + space before `(mm)` |
| 22 | `"Length(mm)"` | NO space before `(mm)` — unlike cols 12 and 13 |
| 38 | `"UNLOADING POINT"` | all caps |
| 39 | `"RECIEVING POINT"` | all caps, sic spelling |
| 45 | `"production workcenter"` | fully lowercase |
| 64 | `"Tensile Strength MPa (B)"` | mixed case with `(B)` |

`normalize_header` (collapse whitespace + lowercase) handles all casing
differences at parse time — the COLUMNS tuple must preserve the original casing
for documentation but the lookup key is always the normalized form.

### B-7 · Party Code join rule

- ZSD `party_code` is stored verbatim (text, may be zero-padded to 10 digits).
- `party_code_normalized` = `party_code.lstrip("0")` — the join key.
- `CustomerCode.code` stores SAP codes as 8-digit values (no zero-padding).
- Internal JSW yard codes (8451–8499, 8001-style) will not match any
  `CustomerCode.code` — `customer_name` and `customer_code_id` stay `None`.
- `CustomerCode.code` is NOT unique — first-match-per-code wins in
  `build_customer_map`.

### B-8 · 250-line splits required (confirmed)

| File | Estimated lines | Split strategy |
|------|----------------|----------------|
| `app/utils/jsw_stock/columns.py` | ~155 | No split needed |
| `app/utils/jsw_stock/excel.py` | ~120 | No split needed |
| `app/models/jsw_stock.py` | ~98 | No split needed |
| `src/components/jsw-stock/ViewJswStockSheet.tsx` | ~110 (with config) | **Requires** `jsw-stock-fields.ts` (~130L); without it ~380L — over limit |
| `src/components/settings/JswStockConfigCard.tsx` | ~215 | Split `JswStockConfigStatus.tsx` (~80L) as sub-component |

All other files are comfortably under 250 lines.

### B-9 · Circular import chain — all scheduler/cron/service imports must be local

```
scheduler.py
  ↓ (local import at call time)
services.cron.jsw_stock
  ↓ (local import inside job body)
services.jsw_stock.poller
  ↓ (module-level imports OK here)
services.jsw_stock.config_service
  ↓ (local import inside upsert_config)
scheduler.py  ← cycle!
```

Pattern: all scheduler ↔ cron ↔ service imports use `# noqa: PLC0415` local
imports inside functions. Module-level imports inside `poller.py`,
`config_service.py`, `emails.py`, `status.py` are fine — the cycle only exists
through the scheduler.

### B-10 · `start_time >= end_time` comparison is correct as string in both BE and FE

HH:MM 24h zero-padded strings sort correctly by lexicographic comparison.
`"08:00" < "20:00"` is `True` in both Python and JavaScript. No time parsing
required for this comparison.

---

## Part C — Exact Wiring Snippets

### C-BE-1 · `app/models/__init__.py`

```python
from .audit_log import AuditLog
from .customer_code import CustomerCode
from .jsw_stock import JswStock
from .jsw_stock_config import JswStockConfig
from .jsw_stock_ingestion import JswStockIngestion
from .region import Region
from .user import User

__all__ = ["AuditLog", "CustomerCode", "JswStock", "JswStockConfig", "JswStockIngestion", "Region", "User"]
```

### C-BE-2 · `app/core/database.py`

```python
# Import line:
from ..models import AuditLog, CustomerCode, JswStock, JswStockConfig, JswStockIngestion, Region, User

# DOCUMENT_MODELS:
DOCUMENT_MODELS = [User, AuditLog, CustomerCode, Region, JswStock, JswStockConfig, JswStockIngestion]
```

### C-BE-3 · `app/models/audit_log.py` — `AuditCategory` Literal

Append `"jsw_stock"` to the existing Literal:

```python
AuditCategory = Literal[
    "http", "auth", "admin", "data", "system", "cron",
    "security", "regions", "customer_codes", "jsw_stock"
]
```

### C-BE-4 · `app/schemas/audit_log.py` — same `AuditCategory` Literal

Must stay in sync with models:

```python
AuditCategory = Literal[
    "http", "auth", "admin", "data", "system", "cron",
    "security", "regions", "customer_codes", "jsw_stock"
]
```

### C-BE-5 · `app/services/audit_log/options.py`

```python
_CATEGORIES: list[str] = [
    "http", "auth", "admin", "data", "system", "cron",
    "security", "regions", "customer_codes", "jsw_stock"
]
```

### C-BE-6 · `app/services/audit/events.py` — append `audit_jsw_stock_event`

```python
async def audit_jsw_stock_event(
    action: str,
    summary: str,
    outcome: str = "success",
    actor_email: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Record a JSW stock event (ingested, failed, missing_alert, config_updated)."""
    await record_audit(
        category="jsw_stock",
        action=action,
        summary=summary,
        outcome=outcome,
        source="service",
        actor_email=actor_email,
        extra=extra,
    )
```

No new import needed — `record_audit` already in `events.py`.

### C-BE-7 · `app/core/scheduler.py` — two additions

**A) `apply_jsw_stock_schedule` — append after `shutdown_scheduler`:**

```python
JSW_STOCK_JOB_ID = "jsw_stock.poll"


async def apply_jsw_stock_schedule() -> None:
    """Add/replace or remove jsw_stock poll job based on current config.

    Called by config_service.upsert_config after every PUT /admin/jsw-stock/config.
    Tolerates scheduler=None (no-op with warning). Guards remove_job with get_job.
    """
    sched = get_scheduler()
    if sched is None:
        logger.warning("apply_jsw_stock_schedule: scheduler not running — skipped.")
        return

    try:
        from apscheduler.triggers.interval import IntervalTrigger      # noqa: PLC0415
        from ..services.cron.jsw_stock import jsw_stock_poll_job       # noqa: PLC0415
        from ..models.jsw_stock_config import JswStockConfig           # noqa: PLC0415

        cfg = await JswStockConfig.find_one({"key": "default"})
        if cfg is not None and cfg.enabled:
            sched.add_job(
                jsw_stock_poll_job,
                trigger=IntervalTrigger(hours=cfg.interval_hours),
                id=JSW_STOCK_JOB_ID,
                name="JSW Stock Excel poll",
                replace_existing=True,
                misfire_grace_time=300,
                next_run_time=__import__("datetime").datetime.now(),
            )
            logger.info("JSW Stock poll scheduled — every %dh.", cfg.interval_hours)
        else:
            if sched.get_job(JSW_STOCK_JOB_ID) is not None:
                sched.remove_job(JSW_STOCK_JOB_ID)
                logger.info("JSW Stock poll removed (disabled).")
    except Exception:  # noqa: BLE001
        logger.warning("apply_jsw_stock_schedule failed.", exc_info=True)
```

**B) `start_scheduler` boot-registration — insert after heartbeat job, before `sched.start()`:**

```python
        # Boot-register JSW Stock poll if already enabled.
        try:
            from ..services.cron.jsw_stock import jsw_stock_poll_job   # noqa: PLC0415
            from ..models.jsw_stock_config import JswStockConfig        # noqa: PLC0415

            jsw_cfg = await JswStockConfig.find_one({"key": "default"})
            if jsw_cfg is not None and jsw_cfg.enabled:
                sched.add_job(
                    jsw_stock_poll_job,
                    trigger=IntervalTrigger(hours=jsw_cfg.interval_hours),
                    id=JSW_STOCK_JOB_ID,
                    name="JSW Stock Excel poll",
                    replace_existing=True,
                    misfire_grace_time=300,
                )
                logger.info("JSW Stock poll registered at startup: every %dh.", jsw_cfg.interval_hours)
        except Exception:  # noqa: BLE001
            logger.warning("JSW Stock job boot-registration skipped.", exc_info=True)
```

### C-BE-8 · `app/routes/__init__.py`

```python
from . import admin_user, audit_log, auth, customer_code, jsw_stock, meta, region, user

api_router = APIRouter()
api_router.include_router(meta.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(admin_user.router)
api_router.include_router(audit_log.router)
api_router.include_router(region.router)
api_router.include_router(customer_code.router)
api_router.include_router(jsw_stock.router)
api_router.include_router(jsw_stock.config_router)
```

### C-BE-9 · `app/services/cron/__init__.py`

```python
from .heartbeat import audited_job, heartbeat_job
from .jsw_stock import jsw_stock_poll_job

__all__ = ["heartbeat_job", "audited_job", "jsw_stock_poll_job"]
```

### C-BE-10 · `app/main.py` — add `"PUT"` to CORS `allow_methods`

```python
# Old:
allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
# New:
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
```

### C-FE-1 · `src/api/client.ts` — add `putData` after `patchData`

```typescript
/** PUT a JSON body and unwrap `data`. */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}
```

### C-FE-2 · `src/components/layout/nav-items.ts`

```typescript
// Import line (add Boxes and Settings):
import { Boxes, Building2, LayoutDashboard, MapPin, ScrollText, Settings, UsersRound } from "lucide-react"

// NAV_ITEMS — add after Dashboard:
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
  { label: "JSW Stock List", to: "/jsw-stock", icon: Boxes },
]

// ADMIN_NAV_ITEMS — append Settings:
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
]
```

### C-FE-3 · `src/App.tsx` — exact final state

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthBootstrap } from "@/components/auth/AuthBootstrap"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { AdminRoute } from "@/routes/AdminRoute"
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { JswStockListPage } from "@/pages/jsw-stock"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
import { SettingsPage } from "@/pages/admin/settings"

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/jsw-stock" element={<JswStockListPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### C-FE-4 · `src/types/admin/audit-log.ts` — add `"jsw_stock"`

```typescript
export type AuditCategory =
  | "http" | "auth" | "admin" | "data" | "system"
  | "cron" | "security" | "regions" | "customer_codes"
  | "jsw_stock"
```

### C-FE-5 · `src/components/admin/audit-logs/AuditCategoryBadge.tsx` — add entry

```typescript
  jsw_stock: {
    label: "JSW Stock",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400",
  },
```

Add after `customer_codes` entry, before the closing `} as const satisfies ...`.

---

## Part D — File Manifest

All files are listed below. **"Wiring"** = single wiring pass (not parallel builders).
**Builder** tags match the SPEC §2/§3 area assignments.

### D-1 · Backend — New Files

| File | Builder | Est. lines |
|------|---------|-----------|
| `backend/app/models/jsw_stock.py` | BE-models | ~98 |
| `backend/app/models/jsw_stock_config.py` | BE-models | ~29 |
| `backend/app/models/jsw_stock_ingestion.py` | BE-models | ~28 |
| `backend/app/schemas/jsw_stock.py` | BE-schemas | ~80 |
| `backend/app/schemas/jsw_stock_record.py` | BE-schemas | ~90 |
| `backend/app/schemas/jsw_stock_config.py` | BE-config | ~120 |
| `backend/app/utils/jsw_stock/__init__.py` | BE-utils | 1 (empty) |
| `backend/app/utils/jsw_stock/columns.py` | BE-utils | ~155 |
| `backend/app/utils/jsw_stock/excel.py` | BE-utils | ~120 |
| `backend/app/utils/jsw_stock/query.py` | BE-services | ~80 |
| `backend/app/services/jsw_stock/__init__.py` | BE-services | 1 (empty) |
| `backend/app/services/jsw_stock/serialize.py` | BE-services | ~90 |
| `backend/app/services/jsw_stock/list.py` | BE-services | ~55 |
| `backend/app/services/jsw_stock/options.py` | BE-services | ~55 |
| `backend/app/services/jsw_stock/customer_map.py` | BE-ingest | ~45 |
| `backend/app/services/jsw_stock/ingest.py` | BE-ingest | ~90 |
| `backend/app/services/jsw_stock/poller.py` | BE-poller | ~95 |
| `backend/app/services/jsw_stock/emails.py` | BE-config | ~80 |
| `backend/app/services/jsw_stock/config_service.py` | BE-config | ~90 |
| `backend/app/services/jsw_stock/status.py` | BE-config | ~55 |
| `backend/app/services/cron/jsw_stock.py` | BE-poller | ~15 |
| `backend/app/controllers/jsw_stock.py` | BE-routes | ~45 |
| `backend/app/controllers/jsw_stock_config.py` | BE-routes | ~45 |
| `backend/app/routes/jsw_stock.py` | BE-routes | ~75 |

### D-2 · Backend — Modified Files (Wiring Pass Only)

| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Add 3 model imports + `__all__` entries |
| `backend/app/core/database.py` | Add 3 models to imports + `DOCUMENT_MODELS` |
| `backend/app/models/audit_log.py` | Append `"jsw_stock"` to `AuditCategory` Literal |
| `backend/app/schemas/audit_log.py` | Append `"jsw_stock"` to `AuditCategory` Literal |
| `backend/app/services/audit_log/options.py` | Append `"jsw_stock"` to `_CATEGORIES` |
| `backend/app/services/audit/events.py` | Append `audit_jsw_stock_event` function |
| `backend/app/core/scheduler.py` | Add `JSW_STOCK_JOB_ID` constant + `apply_jsw_stock_schedule` + boot-registration in `start_scheduler` |
| `backend/app/routes/__init__.py` | Add `jsw_stock` import + two `include_router` calls |
| `backend/app/main.py` | Add `"PUT"` to CORS `allow_methods` |
| `backend/app/services/cron/__init__.py` | Add `jsw_stock_poll_job` to exports |

### D-3 · Frontend — New Files

| File | Builder | Est. lines |
|------|---------|-----------|
| `frontend/src/types/jsw-stock/stock.ts` | FE-types | ~140 |
| `frontend/src/types/jsw-stock/stock-ui.ts` | FE-types | ~105 |
| `frontend/src/types/settings/jsw-stock-config.ts` | FE-types | ~50 |
| `frontend/src/types/settings/jsw-stock-config-ui.ts` | FE-types | ~30 |
| `frontend/src/api/jsw-stock/list.ts` | FE-api | ~50 |
| `frontend/src/api/jsw-stock/options.ts` | FE-api | ~25 |
| `frontend/src/api/settings/jsw-stock-config/get.ts` | FE-api | ~10 |
| `frontend/src/api/settings/jsw-stock-config/update.ts` | FE-api | ~12 |
| `frontend/src/api/settings/jsw-stock-config/status.ts` | FE-api | ~10 |
| `frontend/src/api/settings/jsw-stock-config/runNow.ts` | FE-api | ~10 |
| `frontend/src/components/jsw-stock/JswStockTable.tsx` | FE-stock-page | ~185 |
| `frontend/src/components/jsw-stock/JswStockTableToolbar.tsx` | FE-stock-page | ~70 |
| `frontend/src/components/jsw-stock/JswStockFilters.tsx` | FE-stock-page | ~150 |
| `frontend/src/components/jsw-stock/JswStockTablePagination.tsx` | FE-stock-page | ~150 |
| `frontend/src/components/jsw-stock/ViewJswStockSheet.tsx` | FE-stock-page | ~110 |
| `frontend/src/components/jsw-stock/jsw-stock-fields.ts` | FE-stock-page | ~130 |
| `frontend/src/components/jsw-stock/hooks/useJswStockList.ts` | FE-stock-page | ~110 |
| `frontend/src/pages/jsw-stock/index.tsx` | FE-stock-page | ~80 |
| `frontend/src/components/settings/JswStockConfigCard.tsx` | FE-settings | ~215 |
| `frontend/src/components/settings/JswStockConfigStatus.tsx` | FE-settings | ~80 |
| `frontend/src/components/settings/hooks/useJswStockConfig.ts` | FE-settings | ~95 |
| `frontend/src/pages/admin/settings/index.tsx` | FE-settings | ~45 |

### D-4 · Frontend — Modified Files (Wiring Pass Only)

| File | Change |
|------|--------|
| `frontend/src/api/client.ts` | Add `putData<T>` helper after `patchData` |
| `frontend/src/components/layout/nav-items.ts` | Add `Boxes`+`Settings` icons; add JSW Stock List to `NAV_ITEMS`; add Settings to `ADMIN_NAV_ITEMS` |
| `frontend/src/App.tsx` | Import both pages; add `/jsw-stock` route (outside AdminRoute); add `/admin/settings` route (inside AdminRoute) |
| `frontend/src/types/admin/audit-log.ts` | Append `"jsw_stock"` to `AuditCategory` union |
| `frontend/src/components/admin/audit-logs/AuditCategoryBadge.tsx` | Add `jsw_stock` entry to `CATEGORY_MAP` (orange) |

---

## Part E — Verification Commands

### E-1 · Parse gate (run first — blocks everything else)

```bash
cd "/DATA/CODE_FILES/MARKETING REPORT AUTOMATION"
backend/.venv/bin/python -c "
from backend.app.utils.jsw_stock.excel import parse_workbook
rows = parse_workbook(open('macro_files/ZSD_CURRSTK_HR.xlsx','rb').read())
assert len(rows) == 17324, f'Expected 17324, got {len(rows)}'
print('PASS:', len(rows), 'rows')
"
```

### E-2 · Full import smoke test

```bash
cd "/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/backend"
./.venv/bin/python -c "import app.main; print('imports OK')"
```

### E-3 · Routes present

```bash
cd "/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/backend"
./.venv/bin/python -c "
from app.main import app
routes = [r.path for r in app.routes]
for path in ['/jsw-stock', '/jsw-stock/options', '/admin/jsw-stock/config',
             '/admin/jsw-stock/status', '/admin/jsw-stock/run-now']:
    assert path in routes, f'missing {path}'
print('all routes present')
"
```

### E-4 · Schema validators

```bash
./.venv/bin/python -c "
from app.schemas.jsw_stock_config import JswStockConfigUpdate
# must raise for start >= end
try:
    JswStockConfigUpdate(enabled=True, base_path='/x', file_name='f',
                         start_time='20:00', end_time='08:00',
                         interval_hours=1, notify_emails=[])
    assert False, 'should have raised'
except Exception as e:
    print('start>=end rejected:', e)
# must raise for path traversal
try:
    JswStockConfigUpdate(enabled=True, base_path='/x', file_name='../evil',
                         start_time='08:00', end_time='20:00',
                         interval_hours=1, notify_emails=[])
    assert False, 'should have raised'
except Exception as e:
    print('path traversal rejected:', e)
print('schema validators OK')
"
```

### E-5 · Frontend build

```bash
cd "/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/frontend"
npm run build   # must exit 0
npm run lint    # must be clean on changed files
```

---

*This ADDENDUM is complete. Build agents: read SPEC.md for the full contract,
then read the relevant section of this file before writing any code.*
