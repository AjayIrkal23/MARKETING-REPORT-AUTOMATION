# Customer Code Management — Build-Ready SPEC

> **Status:** Contract locked by orchestrator after Phase-0 codebase audit.
> **Reference domain to mirror 1:1:** `region` (backend) + `regions` (frontend).
> Customer Codes is an admin-only CRUD + Excel-import domain that **links each row
> to a Region by ObjectId**. Build by mirroring the Region domain exactly; only the
> field set, the Excel import/template, the per-field async filters, and the
> region linkage are new.

---

## 0. Golden rules (apply to every file)

1. **Mirror Region.** Every backend/frontend file has a Region analog — read it, copy its
   structure, docstrings density, and idioms. Do not invent new patterns.
2. **Layering (BE):** route → controller (thin) → service (per-action file) → schema/model.
   All DB/business logic in services. Services raise typed `core.errors.AppError` subclasses
   (`NotFoundError` 404, `ConflictError` 409, `ValidationError` 400). No custom errors.py.
3. **Envelope:** every JSON endpoint returns `success(data, message, meta)` →
   `{success, data, message, meta}`. List endpoints put pagination in `meta`.
   **Exceptions:** `GET /template` streams a binary xlsx (no envelope);
   `POST /import` returns a normal JSON envelope wrapping `CustomerCodeImportResult`.
4. **Backend-driven only.** All filtering/sorting/pagination server-side. Sort keys are a
   Pydantic `Literal` whitelist. Unknown query keys rejected via `_ALLOWED_*` frozensets.
   `re.escape` every user string before `$regex` (ReDoS guard).
5. **Admin-gated.** Router-level `dependencies=[Depends(get_current_admin)]`.
6. **File size ≤ 250 lines.** Split before exceeding.
7. **No client-side filtering of server data (FE).** Types in `src/types/admin/`. API calls
   only in `src/api/admin/customer-codes/`. Typed Redux hooks only. shadcn primitives only.
   Semantic design tokens, ≥4.5:1 contrast.
8. **Audit:** mirror Region — add a `customer_codes` audit category + `audit_customer_code_event`
   helper; create/update/delete/import emit domain events. (HTTP middleware already auto-audits.)

---

## 1. Domain fields

Source: `macro_files/west  central customer codes.xlsx` (10 meaningful columns; trailing 2 are junk).

| Excel header (row 1, verbatim) | Model field | Type | Required | Notes |
|---|---|---|---|---|
| `Segment` | `segment` | str | ✅ | e.g. Retail / oem / Stock transfer (casing NOT normalized — store as entered) |
| `code` | `code` | str | ✅ | SAP customer code, numeric in Excel (e.g. `40020365`, `8451`). **Store as trimmed string.** NOT unique (same code repeats across ship-to rows). |
| `Customer` | `customer` | str | ✅ | Customer name |
| `Destination` | `destination` | str | ✅ | City |
| `CAM ` *(trailing space)* | `cam` | str \| None | ⬜ | Account manager |
| `MOB No.` *(may have multiple spaces)* | `mob` | str \| None | ⬜ | Mobile number, numeric in Excel → store as clean string |
| `Head` | `head` | str \| None | ⬜ | Sales head |
| `ROUTE` | `route` | str \| None | ⬜ | Route code (e.g. KAT036) |
| `SHIP TO` | `ship_to` | str \| None | ⬜ | Ship-to code, numeric in Excel → clean string |
| `SHIP TO CUSTOMER` | `ship_to_customer` | str \| None | ⬜ | Ship-to customer name |
| *(not in Excel — chosen in UI)* | `region_id` | str (ObjectId hex) | ✅ | FK → `regions` collection. Single region per create / per import sheet. |

Plus `created_at`, `updated_at` (`datetime`, `_now_utc` default factory; `updated_at` bumped manually on update).

**Cell coercion (importer):** numeric cells (`int`/`float`) → string; strip a trailing `.0`
(`float(x).is_integer()` → `str(int(x))`); `None`/empty → `None` for optionals; empty required → row error.

---

## 2. Backend files

Root: `backend/app/`. **Reference = the Region file of the same role.**

### 2.1 Model — `models/customer_code.py` (ref: `models/region.py`)
```python
class CustomerCode(Document):
    segment:          Annotated[str, Indexed()]
    code:             Annotated[str, Indexed()]
    customer:         Annotated[str, Indexed()]
    destination:      Annotated[str, Indexed()]
    cam:              str | None = None
    mob:              str | None = None
    head:             str | None = None
    route:            str | None = None
    ship_to:          str | None = None
    ship_to_customer: str | None = None
    region_id:        Annotated[str, Indexed()]
    created_at:       Annotated[datetime, Indexed()] = Field(default_factory=_now_utc)
    updated_at:       datetime = Field(default_factory=_now_utc)
    class Settings:
        name = "customer_codes"
```

### 2.2 Schemas — `schemas/customer_code.py` (ref: `schemas/region.py`)
- `CustomerCodeSortBy = Literal["segment","code","customer","destination","cam","head","route","created_at","updated_at"]`
- `CustomerCodeField = Literal["segment","code","customer","destination","cam","mob","head","route","ship_to","ship_to_customer"]`
- `CustomerCodeListQuery(PageQuery)`: `sortBy: CustomerCodeSortBy = "created_at"`; `q: str|None (max_length=200)`;
  one optional filter per field: `segment,code,customer,destination,cam,mob,head,route,ship_to,ship_to_customer` (each `str|None`, max_length 200);
  `region: str|None` (region_id exact match). Field names are the **query keys** (snake_case as above; FE must send `ship_to`/`ship_to_customer`/`region`).
- `CustomerCodeOptionsQuery(BaseModel)`: `field: CustomerCodeField`; `q: str|None (max_length=200)`; `limit: int = Field(20, ge=1, le=50)`.
- `CustomerCodeCreate(BaseModel)`: required `segment,code,customer,destination` (`min_length=1,max_length=200`), `region_id` (`min_length=1`);
  optional `cam,mob,head,route,ship_to,ship_to_customer` (`str|None,max_length=200`).
  `field_validator(mode="before")`: strip strings; convert empty/whitespace optional → `None`; coerce non-str scalars to `str` (defensive).
- `CustomerCodeUpdate(BaseModel)`: every field optional (`None` sentinel), same strip/normalize validators. `model_dump(exclude_unset=True)` drives partial update.
- `CustomerCodePublic(BaseModel)`: `id, segment, code, customer, destination, cam, mob, head, route, ship_to, ship_to_customer, region_id, region_name: str|None, created_at, updated_at`.
- `CustomerCodeImportError(BaseModel)`: `row: int`, `message: str`.
- `CustomerCodeImportResult(BaseModel)`: `total_rows: int`, `inserted: int`, `skipped: int`, `region_id: str`, `region_name: str|None`, `errors: list[CustomerCodeImportError]`.
- `CustomerCodeOption = AsyncOption` — reuse `from .admin_user import AsyncOption` (do NOT define a new shape).

### 2.3 Query utils — `utils/customer_code/query.py` (ref: `utils/region/query.py`)
- `escape_regex(s)` (define locally).
- `build_customer_code_filter(query)`:
  - `q` → `$or` case-insensitive `re.escape` regex over text fields:
    `segment, code, customer, destination, cam, mob, head, route, ship_to, ship_to_customer`.
  - For each per-field filter present → exact match `filt[field] = value`.
  - `region` present → `filt["region_id"] = value`.
- `build_sort(sort_by, sort_order)` → `"+field"/"-field"` (identical to region).

### 2.4 Excel utils — `utils/customer_code/excel.py` (NEW; no region analog)
- `HEADER_MAP: dict[str,str]` keyed by **normalized** header → model field:
  `{"segment":"segment","code":"code","customer":"customer","destination":"destination","cam":"cam","mob no.":"mob","mob no":"mob","mob":"mob","head":"head","route":"route","ship to":"ship_to","ship to customer":"ship_to_customer"}`.
- `REQUIRED_FIELDS = ("segment","code","customer","destination")`.
- `MAX_IMPORT_ROWS = 50000` (DoS guard).
- `normalize_header(h)` = `re.sub(r"\s+"," ", str(h)).strip().lower()`.
- `cell_to_str(v)` → clean string per §1 coercion (handles int/float/.0/None).
- `parse_workbook(file_bytes: bytes) -> tuple[list[dict], list[CustomerCodeImportError]]`:
  - **Import `openpyxl` lazily inside the function** (so `import app.main` works without it installed).
  - `load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)`, active sheet.
  - Read row 1 → build column-index→field map via `HEADER_MAP` (ignore unmapped/junk cols).
  - If required headers missing → return `([], [error("header", ...)])` describing the missing columns.
  - For each data row (cap `MAX_IMPORT_ROWS`): build dict of mapped fields; skip fully-empty rows (counted as skipped, not error); if any required field empty → append `CustomerCodeImportError(row=excel_row_number, message=...)`, else append the parsed dict. Excel row number = index+2 (1-based, +1 header).

### 2.5 Services — `services/customer_code/*.py` (one per action; ref: matching `services/region/*.py`)
- `serialize.py` → `to_customer_code_public(doc, region_name)` (ref: region `serialize.py`).
- `region_link.py` (NEW small helper, ≤80 lines):
  - `async def resolve_region_or_400(region_id) -> Region` → validate ObjectId + existence; raise `ValidationError("Invalid or unknown region.", details={"field":"region_id"})` if bad (used by create/import/update).
  - `async def region_name_map(region_ids: list[str]) -> dict[str,str]` → batch fetch via `Region.find({"_id": {"$in": [PydanticObjectId(i) for valid i]}})`; return `{str(id): name}` (skip unparesable ids).
  - `async def region_name_for(region_id) -> str|None` → single lookup, None if missing/invalid.
- `list.py` → `list_customer_codes(query) -> (list[CustomerCodePublic], PaginationMeta)` (ref: region `list.py`).
  After fetching the page docs, call `region_name_map([d.region_id for d in docs])` and pass each name into `to_customer_code_public`.
- `get.py` → `get_customer_code(code_id)` (ref: region `get.py`); resolve region name via `region_name_for`.
- `create.py` → `create_customer_code(body, *, actor_email)` (ref: region `create.py`):
  `await resolve_region_or_400(body.region_id)`; insert doc; `audit_customer_code_event("customer_code.created", ...)`; return public (with region name). **No uniqueness check** (duplicates allowed).
- `update.py` → `update_customer_code(code_id, body, *, actor_email)` (ref: region `update.py` — read it):
  load doc (404), apply `model_dump(exclude_unset=True)`, if `region_id` changing → `resolve_region_or_400`, bump `updated_at`, save, audit `customer_code.updated`.
- `delete.py` → `delete_customer_code(code_id, *, actor_email)` (ref: region `delete.py`): 404 if missing, delete, audit `customer_code.deleted`.
- `options.py` → `search_field_options(query: CustomerCodeOptionsQuery) -> list[CustomerCodeOption]`:
  build filter `{field: {"$regex": escape_regex(q), "$options":"i"}}` when `q`; use Beanie classmethod
  **`await CustomerCode.distinct(query.field, filt)`** (FindMany has NO `.distinct` — see CODEX). Drop `None`/empty,
  sort case-insensitively, cap to `limit`, map each to `CustomerCodeOption(value=str(v), label=str(v))`.
- `import_rows.py` → `import_customer_codes(file_bytes, region_id, *, actor_email) -> CustomerCodeImportResult`:
  `region = await resolve_region_or_400(region_id)`; `rows, errors = parse_workbook(file_bytes)`;
  build `CustomerCode(**row, region_id=region_id)` list; `await CustomerCode.insert_many(docs)` (or loop insert if insert_many unavailable in Beanie 2.x — verify; fallback loop); emit `audit_customer_code_event("customer_code.imported", summary=f"Imported {inserted} rows into '{region.name}'", extra=...)`; return result. `skipped = total_rows - inserted - len(errors)`.
- `template.py` → `build_template_workbook() -> bytes`:
  lazily import openpyxl; create a workbook with header row = canonical headers
  `["Segment","code","Customer","Destination","CAM","MOB No.","Head","ROUTE","SHIP TO","SHIP TO CUSTOMER"]`,
  optionally one example row; `wb.save(BytesIO)`; return bytes.
- `__init__.py` (mirror region `__init__.py` if it re-exports; region's is empty/minimal — match it).

### 2.6 Controllers — `controllers/customer_code.py` (ref: `controllers/region.py`)
- `_ALLOWED_LIST_KEYS = frozenset({"page","limit","sortBy","sortOrder","q","segment","code","customer","destination","cam","mob","head","route","ship_to","ship_to_customer","region"})`
- `_ALLOWED_OPTION_KEYS = frozenset({"field","q","limit"})`
- Controllers: `list_customer_codes_controller`, `field_options_controller`, `create_customer_code_controller` (201 msg "Customer code created"), `get_customer_code_controller`, `update_customer_code_controller`, `delete_customer_code_controller` — all mirror region, binding `admin: AuthUser = Depends(get_current_admin)` and threading `admin.emailid` to mutations.
- `import_customer_codes_controller(file: UploadFile = File(...), region_id: str = Form(...), admin = Depends(get_current_admin)) -> SuccessEnvelope[CustomerCodeImportResult]`:
  validate extension/content-type (`.xlsx`), read `await file.read()` (cap size, e.g. reject > 10 MB → `ValidationError`), call service, `return success(result, message="Import complete")`.
- `download_template_controller(_admin = Depends(get_current_admin)) -> StreamingResponse`:
  `return StreamingResponse(BytesIO(build_template_workbook()), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="customer_codes_template.xlsx"'})`. **Returns raw file, not an envelope.**

### 2.7 Routes — `routes/customer_code.py` (ref: `routes/region.py` + `routes/audit_log.py`)
Prefix `/admin/customer-codes`, router-level admin dep. **Registration order matters** — literal
segments before `/{code_id}`:
1. `GET ""` → list
2. `GET "/options"` → field options
3. `GET "/template"` → download template (StreamingResponse; no `response_model`)
4. `POST "/import"` → import (`SuccessEnvelope[CustomerCodeImportResult]`)
5. `POST ""` → create (201, `SuccessEnvelope[CustomerCodePublic]`)
6. `GET "/{code_id}"` → get
7. `PATCH "/{code_id}"` → update
8. `DELETE "/{code_id}"` → delete (`SuccessEnvelope[None]`)

---

## 3. Backend wiring (single BE-wire agent — edits shared files)

1. `models/__init__.py` → export `CustomerCode`.
2. `core/database.py` → `from ..models import AuditLog, CustomerCode, Region, User`; add `CustomerCode` to `DOCUMENT_MODELS`.
3. `routes/__init__.py` → `from . import ... customer_code ...`; `api_router.include_router(customer_code.router)`.
4. `requirements.txt` → add `openpyxl==3.1.5` (verify latest installable pin; align to installed).
5. `models/audit_log.py` → add `"customer_codes"` to `AuditCategory` Literal.
6. `schemas/audit_log.py` → add `"customer_codes"` to its `AuditCategory` Literal (keep in sync).
7. `services/audit_log/options.py` → add `"customer_codes"` to `_CATEGORIES`.
8. `services/audit/events.py` → add `audit_customer_code_event(action, summary, *, outcome="success", actor_email=None, extra=None)` (category=`"customer_codes"`, source=`"service"`) mirroring `audit_region_event`.

---

## 4. Frontend files

Root: `frontend/src/`. **Reference = the Region file of the same role.**

### 4.1 Types
- `types/admin/customer-code.ts` (ref: `types/admin/region.ts`):
  `CustomerCode` (all §1 fields incl `region_id`, `region_name`, `created_at`, `updated_at` snake_case);
  `CustomerCodeSortBy`; `CustomerCodeField`; `CustomerCodeListQuery extends PageQuery` (q + per-field optional filters using the **same snake_case keys** + `region`);
  `CreateCustomerCodeInput`; `UpdateCustomerCodeInput`; `CustomerCodeImportResult` + `CustomerCodeImportError`;
  `CustomerCodeOption = AsyncOption`.
- `types/admin/customer-code-ui.ts` (ref: `types/admin/region-ui.ts`): `DialogBaseProps`, and props for
  Table, Toolbar, Filters, Pagination, Create/Edit dialogs, View sheet, Import dialog, RowActionsMenu, plus
  `CustomerCodeQueryState`, `CustomerCodeDialogState` union, `UseCustomerCodeManagementResult`.

### 4.2 API — `api/admin/customer-codes/`
- `list.ts` (ref: region `list.ts`) — `buildQuery` sets page/limit/sortBy/sortOrder, `q`, and each non-empty filter (segment…ship_to_customer, region). `listCustomerCodes(query) -> {rows, meta}`.
- `get.ts`, `create.ts`, `update.ts`, `remove.ts` (mirror region equivalents).
- `options.ts` — `searchCustomerCodeFieldOptions(field: CustomerCodeField) => (q: string) => Promise<AsyncOption[]>`
  (curried factory so each AsyncCombobox gets a stable fetcher) hitting `/admin/customer-codes/options?field=&q=&limit=20`.
- `import.ts` — `importCustomerCodes(file: File, regionId: string) -> Promise<CustomerCodeImportResult>`:
  **raw `fetch`** (NOT `apiClient`, which forces JSON) → `FormData` with `file` + `region_id`,
  `credentials:"include"`, no manual `Content-Type`; parse envelope, throw `ApiError` on failure. Document why apiClient is bypassed.
- `template.ts` — `downloadCustomerCodesTemplate() -> Promise<void>`: raw `fetch` (`credentials:"include"`) →
  `res.blob()` → object URL → anchor click → revoke. Filename `customer_codes_template.xlsx`.

### 4.3 Components — `components/admin/customer-codes/`
- `CustomerCodeTable.tsx` (ref: `regions/RegionTable.tsx`): columns **Segment (badge) · Code · Customer · Destination · Region · CAM · ROUTE · actions**. Sortable headers only for whitelisted sort keys. `loading` prop named `loading` (not `isLoading`). Empty/loading/error states like Region.
- `SegmentBadge.tsx` (NEW; ref styling from `audit-logs/AuditCategoryBadge.tsx`): case-insensitive color map
  retail→blue, oem→violet, "stock transfer"→amber, project→emerald, msme→cyan, default→slate; semantic/quiet tints (`bg-*-500/10 text-*-600 dark:text-*-400` style consistent with existing badges).
- `CustomerCodeTableToolbar.tsx` (ref: `regions/RegionTableToolbar.tsx`): free-text search (AsyncCombobox on `customer` field OR plain search input → sets `q`) + **Region** AsyncCombobox filter (`searchRegionOptions`, clearable) + a **Filters** button opening `CustomerCodeFilters` + **Import** button + **Download template** button + **New customer code** button. Use `ml-auto` to push action buttons right.
- `CustomerCodeFilters.tsx` (NEW): a `Popover` (or `Sheet`) containing one `AsyncCombobox` per filterable field
  (Segment, Code, Customer, Destination, CAM, MOB No., Head, ROUTE, SHIP TO, SHIP TO CUSTOMER), each clearable,
  each fetcher = `searchCustomerCodeFieldOptions(field)`. Selecting a value patches the query; a "Clear all" resets. Keep ≤250 lines (group via a config array mapping field→label).
- `CustomerCodeTablePagination.tsx` (ref: `regions/RegionTablePagination.tsx`).
- `CreateCustomerCodeDialog.tsx` (ref: `regions/CreateRegionDialog.tsx`): form with required Segment/Code/Customer/Destination
  (`Field/FieldLabel/FieldError`), optional CAM/MOB/Head/ROUTE/SHIP TO/SHIP TO CUSTOMER, and a **required Region**
  `AsyncCombobox` (`searchRegionOptions`, stores region_id + shows region label). Validate required client-side; on submit
  `createCustomerCode`, toast, `onSubmitted()`. Error banner at top, `aria-busy` while submitting. May split a large field grid into a `CustomerCodeFormFields.tsx` subcomponent if needed to stay ≤250 lines.
- `EditCustomerCodeDialog.tsx` (ref: `regions/EditRegionDialog.tsx`): same fields prefilled; PATCH only changed fields.
- `ViewCustomerCodeSheet.tsx` (ref: `regions/ViewRegionSheet.tsx`): read-only detail (all fields + region name + timestamps).
- `ImportCustomerCodesDialog.tsx` (NEW): a **required Region** `AsyncCombobox` + file `<input type="file" accept=".xlsx">`
  + "Download template" link + Import button (disabled until region+file chosen). While uploading show `Progress`/spinner.
  On success render the `CustomerCodeImportResult` summary (inserted/skipped/errors list) and call `onImported()` to refetch.
- `RowActionsMenu.tsx` (ref: `regions/RowActionsMenu.tsx`): View / Edit / Delete.
- `hooks/useCustomerCodeManagement.ts` (ref: `regions/hooks/useRegionManagement.ts`): owns `CustomerCodeQueryState`
  (page, limit, sortBy, sortOrder, q, all per-field filters, region) + fetch + setters + dialog state.
- `hooks/useCustomerCodeMutations.ts` (ref: `regions/hooks/useRegionMutations.ts`): create/update/delete/import with toasts.

### 4.4 Page — `pages/admin/customer-codes/index.tsx` (ref: `pages/admin/regions/index.tsx`)
Export `CustomerCodeManagementPage`. Compose `AdminPageHeader` + Toolbar + Table + Pagination + dialog stack
(Create/Edit/View/Import + shared `ConfirmActionDialog` variant `delete`).

### 4.5 Frontend wiring (single FE-wire agent — edits shared files)
1. `App.tsx` → import `CustomerCodeManagementPage`; add `<Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />` inside the `AdminRoute` block.
2. `components/layout/nav-items.ts` → add `{ label: "Customer Codes", to: "/admin/customer-codes", icon: <pick a lucide icon e.g. Boxes or Building2> }` to `ADMIN_NAV_ITEMS`. Import the icon.
3. `types/admin/audit-log.ts` → add `"customer_codes"` to the `AuditCategory` union.
4. `components/admin/audit-logs/AuditCategoryBadge.tsx` → add a color mapping for `"customer_codes"` (e.g. sky/indigo) consistent with existing entries.

---

## 5. UI/UX consistency & premium polish (design skills)

- Page shell, header, spacing, table density, badge tints, dialog/sheet layout, toolbar arrangement
  must be **visually indistinguishable in quality** from User/Region/Audit pages. Use `AdminPageHeader`.
- Use shadcn primitives only (`table, sheet, dialog, tabs, select, command, popover, badge, button, input, field, label, progress, sonner`).
- Semantic tokens; ≥4.5:1 contrast; dark-mode correct.
- No "AI slop": consistent gaps (`gap-2`/`gap-4`), aligned columns, truncation with tooltips for long cells,
  empty-state and loading skeletons matching Region, focus-visible rings, accessible labels on every combobox/input.
- SegmentBadge gives the table a polished, scannable identity without garish color.
- Import dialog must feel guided: region first, then template hint, then file, then a clear result summary.

---

## 6. Verification gates (Phase 4)

- BE: `./.venv/bin/pip install -r requirements.txt` (incl openpyxl) → `./.venv/bin/python -c "import app.main"` OK;
  8 `/admin/customer-codes*` routes registered; unauth list → 401 (TestClient); `build_template_workbook()` returns
  valid xlsx bytes; `parse_workbook` round-trips the real `west  central customer codes.xlsx` (≥1 row parsed, region added);
  every new BE file ≤250 lines.
- FE: `npm run build` green; `npm run lint` clean for customer-codes files; every new FE file ≤250 lines.
- Contract: FE query keys/sort keys/field names ⇔ BE schemas exactly (esp. `ship_to`, `ship_to_customer`, `region`).
- Dead-code: every new component/service is consumed.
- Design: page parity with Region/User pages.

---

## 7. Out of scope / non-goals

- No casing normalization of stored values (store as entered).
- No uniqueness constraint on `code` (duplicates are valid).
- No CSV import (xlsx only, exact template).
- No bulk edit/delete; no per-row region change in import (one region per sheet).
- Do not fix the unrelated pre-existing `AdminRoute.tsx` selector bug (out of scope).
