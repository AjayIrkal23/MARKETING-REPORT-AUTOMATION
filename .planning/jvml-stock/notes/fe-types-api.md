# FE Types + API — Builder-Ready Notes (JVML Stock)

> READ-ONLY audit. All patterns extracted from reference files dated 2026-05-31.
> Build jvml-namespaced files ONLY. Never touch jsw-stock/*.

---

## 1. Confirmed import paths + signatures from reference code

### PageQuery — `src/types/api/envelope.ts`
```ts
export interface PageQuery {
  page?: number
  limit?: number
  sortOrder?: SortOrder   // "asc" | "desc"
  // NOTE: sortBy is NOT in the base — each domain adds its own typed sortBy field
}
```

### PaginatedResult — same file
```ts
export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta   // { page, limit, total, totalPages, sortBy, sortOrder }
}
```
`getList<T>(path)` returns `PaginatedResult<T>` directly — already unwraps `env.data` + `env.meta`.

### AsyncOption — `src/types/admin/options.ts`
```ts
export interface AsyncOption {
  value: string
  label: string
  sublabel?: string
}
```

### client.ts helpers (all confirmed present)
| Function | Signature | Notes |
|---|---|---|
| `getData<T>(path)` | `Promise<T>` | GET, unwraps `.data` |
| `postData<T>(path, body)` | `Promise<T>` | POST JSON, unwraps `.data` |
| `patchData<T>(path, body)` | `Promise<T>` | PATCH JSON, unwraps `.data` |
| `deleteData<T>(path)` | `Promise<T>` | DELETE, unwraps `.data` |
| `getList<T>(path)` | `Promise<PaginatedResult<T>>` | GET, returns `{data, meta}` |
| `buildQuery(params)` | `string` | Skips `undefined` AND `""` — see §3 |
| **`putData<T>`** | **NOT YET IN client.ts** | ORCHESTRATOR must add it |

### buildQuery empty-stripping rule
```ts
// from client.ts line 82-87:
for (const [key, value] of Object.entries(params)) {
  if (value !== undefined && value !== "") search.set(key, String(value))
}
```
**Both `undefined` and `""` are stripped.** The customer-codes list.ts pattern relies on this —
spread `{ q: q.q }` only when `q.q` is truthy, but could also just pass `q.q` directly since
`buildQuery` strips `""`. Either pattern works; be consistent with the reference.

---

## 2. buildParams pattern (from customer-codes/list.ts — verbatim mirror)

```ts
function buildParams(
  q: JvmlStockListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    ...(q.q ? { q: q.q } : {}),
    // 10 per-field filters — only include when non-empty:
    ...(q.so_sales_org ? { so_sales_org: q.so_sales_org } : {}),
    ...(q.sales_order_type ? { sales_order_type: q.sales_order_type } : {}),
    ...(q.distr_chnl ? { distr_chnl: q.distr_chnl } : {}),
    ...(q.sold_to_party ? { sold_to_party: q.sold_to_party } : {}),
    ...(q.customer ? { customer: q.customer } : {}),
    ...(q.material ? { material: q.material } : {}),
    ...(q.sales_office ? { sales_office: q.sales_office } : {}),
    ...(q.so_product_form ? { so_product_form: q.so_product_form } : {}),
    ...(q.jsw_grade ? { jsw_grade: q.jsw_grade } : {}),
    ...(q.nco_declared ? { nco_declared: q.nco_declared } : {}),
    // Date range — forward even when undefined (buildQuery strips them):
    ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}),
    ...(q.dateTo ? { dateTo: q.dateTo } : {}),
  }
}
```

---

## 3. SPEC mismatches / gaps vs reference code

| # | SPEC says | Reality in reference files | Action |
|---|---|---|---|
| M1 | `putData` in client.ts | NOT present — only `getData`, `postData`, `patchData`, `deleteData` exist | ORCHESTRATOR adds it; builder can assume it exists per SPEC §4 item 9 |
| M2 | `JvmlStockListQuery` has `sortBy?` | Reference `PageQuery` does NOT include `sortBy` — each domain adds its own typed field. Pattern: `interface CustomerCodeListQuery extends PageQuery { sortBy?: CustomerCodeSortBy; ... }` | Confirmed correct pattern — add typed `sortBy?: JvmlStockSortBy` directly in the domain query |
| M3 | SPEC table col 70: `lc_exp_date` typed `text` | Matches §1 note "text" + "dd.mm.yyyy" format, correct | No issue |
| M4 | SPEC says date→ `string\|null` ISO in FE | Backend serializes `datetime` → ISO string. Frontend stores as `string\|null` for date fields | Correct per reference pattern |
| M5 | SPEC options endpoint: `/jvml-stock/options` (no `/admin/` prefix) | Customer-codes uses `/admin/customer-codes/options`. JVML Stock list is non-admin, so its options route is also non-admin: `/jvml-stock/options` — consistent with SPEC §2 routes | Confirmed — no admin prefix on options |

---

## 4. Ready-to-paste: `src/types/jvml-stock/stock.ts`

```ts
/**
 * JVML Stock API contracts — aligned with backend `jvml_stock` domain.
 * Contract source: .planning/jvml-stock/SPEC.md §1 and §3.
 */

import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys for GET /jvml-stock (must match backend JvmlStockSortBy Literal). */
export type JvmlStockSortBy =
  | "created_at"
  | "report_date"
  | "customer"
  | "customer_name"
  | "party_code"
  | "sold_to_party"
  | "ship_to_party"
  | "material"
  | "jsw_grade"
  | "sales_office"
  | "so_sales_org"
  | "sales_order_type"
  | "distr_chnl"
  | "so_product_form"
  | "nco_declared"
  | "batch"
  | "unrestr_qty"
  | "stock_quantity"
  | "aging"

/**
 * Filterable field names for GET /jvml-stock/options.
 * Exactly 10 — maps 1:1 to backend JvmlStockField Literal.
 */
export type JvmlStockField =
  | "so_sales_org"
  | "sales_order_type"
  | "distr_chnl"
  | "sold_to_party"
  | "customer"
  | "material"
  | "sales_office"
  | "so_product_form"
  | "jsw_grade"
  | "nco_declared"

/**
 * Client-safe JVML stock row returned by GET /jvml-stock.
 * Mirrors backend JvmlStockPublic schema.
 * text → string|null, number → number|null, date → string|null (ISO-8601).
 */
export interface JvmlStock {
  id: string
  // --- §1 72 columns ---
  so_sales_org: string | null            // col 1  text
  sales_order_type: string | null        // col 2  text
  distr_chnl: string | null             // col 3  text
  sold_to_party: string | null          // col 4  text  filter+q
  party_code: string | null             // col 5  text  q
  ship_to_party: string | null          // col 6  text  q
  customer: string | null               // col 7  text  filter+q
  material: string | null               // col 8  text  filter+q
  sales_office: string | null           // col 9  text  filter+q
  so_product_form: string | null        // col 10 text  filter
  jsw_grade: string | null              // col 11 text  filter+q
  act_thickness_mm: string | null       // col 12 text
  width_mm: string | null               // col 13 text
  batch: string | null                  // col 14 text  q
  unrestr_qty: number | null            // col 15 number
  in_quality_insp: number | null        // col 16 number
  blocked: number | null                // col 17 number
  stock_quantity: number | null         // col 18 number
  usage_decision: string | null         // col 19 text
  nco_declared: string | null           // col 20 text  filter
  next_workcenter: string | null        // col 21 text
  length_mm: string | null              // col 22 text
  nco_reason: string | null             // col 23 text
  ud_remarks: string | null             // col 24 text
  aging: number | null                  // col 25 number
  production_date: string | null        // col 26 date  → ISO string
  shift: string | null                  // col 27 text
  sales_order_no: string | null         // col 28 text  q
  so_item_num: string | null            // col 29 text
  order_status: string | null           // col 30 text
  location: string | null               // col 31 text
  str_no: string | null                 // col 32 text
  sto_no: string | null                 // col 33 text
  do_no: string | null                  // col 34 text
  shipment: string | null               // col 35 text
  storage_location: string | null       // col 36 text
  port_name: string | null              // col 37 text
  unloading_point: string | null        // col 38 text
  recieving_point: string | null        // col 39 text  NOTE: keep original spelling
  purchase_order_number: string | null  // col 40 text
  scheduled_status: string | null       // col 41 text
  eq_specification: string | null       // col 42 text
  eq_sub_grade: string | null           // col 43 text
  so_end_application: string | null     // col 44 text
  production_workcenter: string | null  // col 45 text
  ys_in_mpa: number | null              // col 46 number
  elongation: string | null             // col 47 text
  elongation_mic: number | null         // col 48 number
  hardness: string | null               // col 49 text
  s_aluminium_pct: number | null        // col 50 number
  s_boron_pct: number | null            // col 51 number
  s_carbon_pct: number | null           // col 52 number
  s_chromium_pct: number | null         // col 53 number
  s_copper_pct: number | null           // col 54 number
  s_manganese_pct: number | null        // col 55 number
  s_molybdenum_pct: number | null       // col 56 number
  s_nickel_pct: number | null           // col 57 number
  s_niobium_pct: number | null          // col 58 number
  s_phosphorus_pct: number | null       // col 59 number
  s_silicon_pct: number | null          // col 60 number
  s_sulphur_pct: number | null          // col 61 number
  s_titanium_pct: number | null         // col 62 number
  s_vanadium_pct: number | null         // col 63 number
  tensile_strength_mpa_b: number | null // col 64 number
  yield_strength: string | null         // col 65 text
  uts: string | null                    // col 66 text
  special_stock: string | null          // col 67 text
  cp_number: string | null              // col 68 text
  cp_end_date: string | null            // col 69 date  → ISO string
  lc_exp_date: string | null            // col 70 text  (dd.mm.yyyy stored verbatim)
  route: string | null                  // col 71 text
  route_desc: string | null             // col 72 text
  // --- 7 meta/mapping fields ---
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string              // "dd-mm-yyyy" source folder date
  source_file: string | null
  created_at: string               // ISO-8601 UTC — the date-range filter field
  updated_at: string               // ISO-8601 UTC
}

/**
 * Query params for GET /jvml-stock.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 * Per-field filter keys are snake_case matching backend JvmlStockListQuery exactly.
 */
export interface JvmlStockListQuery extends PageQuery {
  sortBy?: JvmlStockSortBy
  q?: string
  // 10 per-field exact-match filters:
  so_sales_org?: string
  sales_order_type?: string
  distr_chnl?: string
  sold_to_party?: string
  customer?: string
  material?: string
  sales_office?: string
  so_product_form?: string
  jsw_grade?: string
  nco_declared?: string
  // Date range (matched against created_at on backend):
  dateFrom?: string   // ISO-8601
  dateTo?: string     // ISO-8601
}

/** Type alias — identical to AsyncOption. Do NOT create a new shape. */
export type JvmlStockOption = AsyncOption
```

> Import `AsyncOption` at the top of the file:
> `import type { AsyncOption } from "@/types/admin/options"`

---

## 5. Ready-to-paste: `src/types/jvml-stock/stock-ui.ts`

```ts
/**
 * JVML Stock component prop contracts.
 * Mirrors customer-code-ui.ts patterns exactly.
 * NOTE: table prop is 'loading' (NOT 'isLoading'); pagination prop is 'isLoading'.
 */

import type { JvmlStock, JvmlStockListQuery, JvmlStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

export interface DialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface ViewJvmlStockSheetProps extends DialogBaseProps {
  row: JvmlStock | null
}

export interface JvmlStockTableProps {
  rows: JvmlStock[]
  /** Named 'loading' (NOT 'isLoading') — mirrors CustomerCodeTable. */
  loading: boolean
  error: string | null
  sortBy: JvmlStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
  onView: (row: JvmlStock) => void
}

export interface JvmlStockTableToolbarProps {
  query: JvmlStockListQuery
  onQueryChange: (patch: Partial<JvmlStockListQuery>) => void
}

export interface JvmlStockFiltersProps {
  so_sales_org: string
  sales_order_type: string
  distr_chnl: string
  sold_to_party: string
  customer: string
  material: string
  sales_office: string
  so_product_form: string
  jsw_grade: string
  nco_declared: string
  onFilterChange: (patch: Partial<Pick<JvmlStockQueryState,
    | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
    | "customer" | "material" | "sales_office" | "so_product_form"
    | "jsw_grade" | "nco_declared">>) => void
  onClearAll: () => void
}

export interface JvmlStockTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading') — mirrors CustomerCodeTablePagination. */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

export type JvmlStockQueryState = {
  page: number
  limit: number
  sortBy: JvmlStockSortBy
  sortOrder: "asc" | "desc"
  q: string
  // Per-field filters — empty string means "no filter" (stripped before API call)
  so_sales_org: string
  sales_order_type: string
  distr_chnl: string
  sold_to_party: string
  customer: string
  material: string
  sales_office: string
  so_product_form: string
  jsw_grade: string
  nco_declared: string
  // Date range
  dateFrom: string
  dateTo: string
}

// ---------------------------------------------------------------------------
// Dialog discriminated union (view-only — no CRUD)
// ---------------------------------------------------------------------------

export type JvmlStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JvmlStock }

// ---------------------------------------------------------------------------
// useJvmlStockList hook return contract
// ---------------------------------------------------------------------------

export interface UseJvmlStockListResult {
  query: JvmlStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JvmlStockSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  /** Single setter for all per-field filters + dateFrom/dateTo — resets page to 1. */
  setFilter: (patch: Partial<Pick<JvmlStockQueryState,
    | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
    | "customer" | "material" | "sales_office" | "so_product_form"
    | "jsw_grade" | "nco_declared">>) => void
  setDateRange: (dateFrom: string, dateTo: string) => void
  clearFilters: () => void
  rows: JvmlStock[]
  meta: PaginationMeta | null
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  dialog: JvmlStockDialogState
  openDialog: (d: JvmlStockDialogState) => void
  closeDialog: () => void
  actions: {
    refetch: () => void
  }
}
```

---

## 6. Ready-to-paste: `src/types/settings/jvml-stock-config.ts`

```ts
/**
 * JVML Stock config + status types for the Settings page.
 * Mirrors backend JvmlStockConfigPublic / JvmlStockStatusPublic schemas.
 */

export interface JvmlStockConfig {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string     // "HH:MM"
  end_time: string       // "HH:MM"
  interval_hours: number // 1–24
  notify_emails: string[]
  updated_at: string | null  // ISO-8601 UTC or null if never saved
}

/** PUT body for PATCH/PUT /admin/jvml-stock/config */
export interface JvmlStockConfigInput {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string
  end_time: string
  interval_hours: number
  notify_emails: string[]
}

export interface JvmlStockIngestionRow {
  report_date: string
  status: string
  row_count: number
  found_at: string | null
  created_at: string
}

export interface JvmlStockStatus {
  enabled: boolean
  last_report_date: string | null
  last_status: string | null
  last_row_count: number | null
  last_found_at: string | null
  last_alerted_at: string | null
  last_error: string | null
  recent: JvmlStockIngestionRow[]
}
```

---

## 7. Ready-to-paste: `src/types/settings/jvml-stock-config-ui.ts`

```ts
/**
 * Settings — JVML Stock config form prop contracts.
 */

import type { JvmlStockConfig, JvmlStockConfigInput, JvmlStockStatus } from "./jvml-stock-config"

export interface JvmlStockConfigCardProps {
  /** If provided, renders inside this instead of a standalone Card. */
  className?: string
}

export interface JvmlStockConfigStatusProps {
  status: JvmlStockStatus | null
  isLoading: boolean
}

export interface UseJvmlStockConfigResult {
  config: JvmlStockConfig | null
  status: JvmlStockStatus | null
  form: JvmlStockConfigInput
  setForm: (patch: Partial<JvmlStockConfigInput>) => void
  isLoading: boolean
  isSaving: boolean
  isRunningNow: boolean
  error: string | null
  save: () => Promise<void>
  runNow: () => Promise<void>
}
```

---

## 8. Ready-to-paste: `src/api/jvml-stock/list.ts`

```ts
/** GET /jvml-stock — backend-driven paginated JVML stock list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { JvmlStock, JvmlStockListQuery } from "@/types/jvml-stock/stock"

function buildParams(
  q: JvmlStockListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    ...(q.q ? { q: q.q } : {}),
    ...(q.so_sales_org ? { so_sales_org: q.so_sales_org } : {}),
    ...(q.sales_order_type ? { sales_order_type: q.sales_order_type } : {}),
    ...(q.distr_chnl ? { distr_chnl: q.distr_chnl } : {}),
    ...(q.sold_to_party ? { sold_to_party: q.sold_to_party } : {}),
    ...(q.customer ? { customer: q.customer } : {}),
    ...(q.material ? { material: q.material } : {}),
    ...(q.sales_office ? { sales_office: q.sales_office } : {}),
    ...(q.so_product_form ? { so_product_form: q.so_product_form } : {}),
    ...(q.jsw_grade ? { jsw_grade: q.jsw_grade } : {}),
    ...(q.nco_declared ? { nco_declared: q.nco_declared } : {}),
    ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}),
    ...(q.dateTo ? { dateTo: q.dateTo } : {}),
  }
}

/**
 * Fetch a paginated, server-filtered page of JVML stock rows.
 * All filtering, sorting, and pagination is backend-driven.
 */
export function listJvmlStock(
  query: JvmlStockListQuery = {},
): Promise<PaginatedResult<JvmlStock>> {
  return getList<JvmlStock>(
    `/jvml-stock${buildQuery(buildParams(query))}`,
  )
}
```

---

## 9. Ready-to-paste: `src/api/jvml-stock/options.ts`

```ts
/**
 * GET /jvml-stock/options — curried async option search per field (<=20 results).
 *
 * IMPORTANT: Freeze the outer call at module scope or useMemo([]) — never inline in JSX.
 * Usage:
 *   const FETCHERS = Object.fromEntries(
 *     JVML_STOCK_FIELDS.map(f => [f, searchJvmlStockFieldOptions(f)])
 *   ) as Record<JvmlStockField, (q: string) => Promise<AsyncOption[]>>
 */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { JvmlStockField } from "@/types/jvml-stock/stock"

/**
 * Curried factory — returns a field-specific async option fetcher.
 * Endpoint: GET /jvml-stock/options (no /admin/ prefix — accessible to all authenticated users).
 */
export function searchJvmlStockFieldOptions(
  field: JvmlStockField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/jvml-stock/options${buildQuery({ field, q, limit: 20 })}`,
    )
}
```

---

## 10. Ready-to-paste: `src/api/settings/jvml-stock-config/get.ts`

```ts
/** GET /admin/jvml-stock/config */

import { getData } from "@/api/client"
import type { JvmlStockConfig } from "@/types/settings/jvml-stock-config"

export function getJvmlStockConfig(): Promise<JvmlStockConfig> {
  return getData<JvmlStockConfig>("/admin/jvml-stock/config")
}
```

---

## 11. Ready-to-paste: `src/api/settings/jvml-stock-config/update.ts`

```ts
/**
 * PUT /admin/jvml-stock/config
 * NOTE: putData is added to api/client.ts by the ORCHESTRATOR (§4 item 9).
 * Pattern mirrors patchData — PUT replaces full config.
 */

import { putData } from "@/api/client"
import type { JvmlStockConfig, JvmlStockConfigInput } from "@/types/settings/jvml-stock-config"

export function updateJvmlStockConfig(body: JvmlStockConfigInput): Promise<JvmlStockConfig> {
  return putData<JvmlStockConfig>("/admin/jvml-stock/config", body)
}
```

---

## 12. Ready-to-paste: `src/api/settings/jvml-stock-config/status.ts`

```ts
/** GET /admin/jvml-stock/status */

import { getData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function getJvmlStockStatus(): Promise<JvmlStockStatus> {
  return getData<JvmlStockStatus>("/admin/jvml-stock/status")
}
```

---

## 13. Ready-to-paste: `src/api/settings/jvml-stock-config/runNow.ts`

```ts
/** POST /admin/jvml-stock/run-now */

import { postData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function runJvmlStockCheckNow(): Promise<JvmlStockStatus> {
  return postData<JvmlStockStatus>("/admin/jvml-stock/run-now", {})
}
```

---

## 14. Key naming / casing gotchas

- `recieving_point` — keep the original Excel misspelling (col 39 in SPEC is `recieving_point`).
- `lc_exp_date` is `string|null` (text type), NOT a date type — it stores dd.mm.yyyy verbatim.
- `dateFrom`/`dateTo` are camelCase query keys (matching SPEC §2 backend schema field names).
- All 10 filter query keys are snake_case to match backend `JvmlStockListQuery` exactly.
- Table prop: `loading: boolean` (NOT `isLoading`). Pagination prop: `isLoading: boolean`. This asymmetry is intentional (mirrors customer-code-ui.ts line 97 and 141 comments).
- `customer_name` in the table is the mapped field (from `CustomerCode`), not the raw `customer` col — render italic "—" when null.
- Options endpoint has NO `/admin/` prefix: `/jvml-stock/options` (the list feature is accessible to all authenticated users, not admin-only).

---

## 15. Files the builder creates

```
src/types/jvml-stock/stock.ts
src/types/jvml-stock/stock-ui.ts
src/types/settings/jvml-stock-config.ts
src/types/settings/jvml-stock-config-ui.ts
src/api/jvml-stock/list.ts
src/api/jvml-stock/options.ts
src/api/settings/jvml-stock-config/get.ts
src/api/settings/jvml-stock-config/update.ts
src/api/settings/jvml-stock-config/status.ts
src/api/settings/jvml-stock-config/runNow.ts
```

ORCHESTRATOR-only (do NOT create in this session):
- `src/api/client.ts` — add `putData<T>`
- `src/components/layout/nav-items.ts` — add nav entries
- `src/App.tsx` — add routes
- `src/pages/admin/settings/index.tsx` — create or append
