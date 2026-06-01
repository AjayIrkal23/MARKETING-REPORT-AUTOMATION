# FE Types + API — Implementation Note
## Area: `src/types/jsw-stock/`, `src/types/settings/`, `src/api/jsw-stock/`, `src/api/settings/jsw-stock-config/`, `src/api/client.ts`

> Builder: follow these skeletons verbatim — field names, import paths, and
> function signatures are the contract. Reference implementation is the
> `customer-codes` domain (list.ts / options.ts patterns copied exactly).

---

## Validation findings

### SPEC correctness
The SPEC's FE types/API section is correct and internally consistent with the
backend schemas. Specific confirmations:

- `buildQuery` in `api/client.ts` already strips `undefined` and `""` — no
  extra stripping needed in domain list modules (match the pattern in
  `customer-codes/list.ts` exactly).
- `getList<T>` returns `PaginatedResult<T>` (`{ data: T[], meta: PaginationMeta }`)
  — the shape is correct, no unwrap needed in domain modules.
- `getData<T>` returns `T` (unwrapped from envelope) — correct for config/status.
- `postData<T>` exists. `putData<T>` does NOT exist yet — must be added (see §5).
- `patchData` exists and is the exact model for `putData` — copy it, change
  `"PATCH"` to `"PUT"`.
- The curried options factory in `customer-codes/options.ts` is the exact pattern
  to mirror — stable outer call, inner `(q: string) => Promise<AsyncOption[]>`.
- `AsyncOption` lives in `src/types/admin/options.ts` — import from there (not
  from `customer-code.ts`).
- `PageQuery` (base for `JswStockListQuery`) is in `src/types/api/envelope.ts`.
- Table prop uses `loading: boolean` (NOT `isLoading`); pagination prop uses
  `isLoading: boolean` — this SPEC matches the established convention.
- `JswStockDialogState` is `{type:"none"} | {type:"view"; row: JswStock}` (no
  create/edit/delete — read-only list). The SPEC uses `row` not `customerCode`.

### Corrections / clarifications
1. `JswStockListQuery` must include `sortBy?: JswStockSortBy` — the SPEC lists
   this implicitly. Add it explicitly (see skeleton below).
2. The `buildParams` helper inside `api/jsw-stock/list.ts` must NOT forward
   `dateFrom`/`dateTo` when they are empty strings — use the same conditional
   spread pattern as `customer-codes/list.ts` does for per-field filters.
3. `src/api/settings/jsw-stock-config/update.ts` uses `putData` (PUT body),
   NOT `patchData`. `putData` replaces the entire config (idempotent upsert).
4. `runNow.ts` sends `postData('/admin/jsw-stock/run-now', {})` — empty body
   object required (JSON body needed for `Content-Type: application/json`).
5. The 12 `JswStockField` values drive both the filter keys in
   `JswStockListQuery` and the `field` param in `options.ts`. They must match
   the backend `JswStockField` Literal exactly (see §1 of SPEC).

---

## 1. `src/types/jsw-stock/stock.ts`

```typescript
/**
 * JSW Stock list — domain types aligned with backend `jsw_stock` domain.
 * SPEC: .planning/jsw-stock/SPEC.md §1 + §3.
 */
import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys — must match backend JswStockSortBy Literal exactly. */
export type JswStockSortBy =
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

/** 12 filterable field names — must match backend JswStockField Literal exactly. */
export type JswStockField =
  | "so_sales_org"
  | "sales_order_type"
  | "distr_chnl"
  | "sold_to_party"
  | "party_code"
  | "ship_to_party"
  | "customer"
  | "material"
  | "sales_office"
  | "so_product_form"
  | "jsw_grade"
  | "nco_declared"

/**
 * Single JSW Stock row — mirrors backend JswStockPublic schema.
 * text → string|null, number → number|null, date → string|null (ISO).
 */
export interface JswStock {
  id: string
  // --- text fields ---
  so_sales_org: string | null
  sales_order_type: string | null
  distr_chnl: string | null
  sold_to_party: string | null
  party_code: string | null
  ship_to_party: string | null
  customer: string | null
  material: string | null
  sales_office: string | null
  so_product_form: string | null
  jsw_grade: string | null
  act_thickness_mm: string | null
  width_mm: string | null
  batch: string | null
  // --- number fields ---
  unrestr_qty: number | null
  in_quality_insp: number | null
  blocked: number | null
  stock_quantity: number | null
  // --- text fields (continued) ---
  usage_decision: string | null
  nco_declared: string | null
  next_workcenter: string | null
  length_mm: string | null
  nco_reason: string | null
  ud_remarks: string | null
  // --- number ---
  aging: number | null
  // --- date (ISO string from backend) ---
  production_date: string | null
  // --- text ---
  shift: string | null
  sales_order_no: string | null
  so_item_num: string | null
  order_status: string | null
  location: string | null
  str_no: string | null
  sto_no: string | null
  do_no: string | null
  shipment: string | null
  storage_location: string | null
  port_name: string | null
  unloading_point: string | null
  recieving_point: string | null
  purchase_order_number: string | null
  scheduled_status: string | null
  eq_specification: string | null
  eq_sub_grade: string | null
  so_end_application: string | null
  production_workcenter: string | null
  // --- number ---
  ys_in_mpa: number | null
  // --- text ---
  elongation: string | null
  // --- number ---
  elongation_mic: number | null
  // --- text ---
  hardness: string | null
  // --- number ---
  s_aluminium_pct: number | null
  s_boron_pct: number | null
  s_carbon_pct: number | null
  s_chromium_pct: number | null
  s_copper_pct: number | null
  s_manganese_pct: number | null
  s_molybdenum_pct: number | null
  s_nickel_pct: number | null
  s_niobium_pct: number | null
  s_phosphorus_pct: number | null
  s_silicon_pct: number | null
  s_sulphur_pct: number | null
  s_titanium_pct: number | null
  s_vanadium_pct: number | null
  tensile_strength_mpa_b: number | null
  // --- text ---
  yield_strength: string | null
  uts: string | null
  special_stock: string | null
  cp_number: string | null
  // --- date ---
  cp_end_date: string | null
  // --- text ---
  lc_exp_date: string | null
  route: string | null
  route_desc: string | null
  // --- mapping / meta fields ---
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string
  source_file: string | null
  created_at: string
  updated_at: string
}

/**
 * Query params for GET /jsw-stock.
 * All filtering is server-driven. Keys must match backend JswStockListQuery exactly.
 */
export interface JswStockListQuery extends PageQuery {
  sortBy?: JswStockSortBy
  q?: string
  // 12 per-field exact-match filters
  so_sales_org?: string
  sales_order_type?: string
  distr_chnl?: string
  sold_to_party?: string
  party_code?: string
  ship_to_party?: string
  customer?: string
  material?: string
  sales_office?: string
  so_product_form?: string
  jsw_grade?: string
  nco_declared?: string
  // date-range filter on created_at (ISO-8601 strings)
  dateFrom?: string
  dateTo?: string
}
```

**Line count estimate: ~140 lines. Well within 250-line limit.**

---

## 2. `src/types/jsw-stock/stock-ui.ts`

```typescript
/**
 * JSW Stock UI prop contracts.
 * Mirror: src/types/admin/customer-code-ui.ts (read-only list — no create/edit/delete).
 */
import type { JswStock, JswStockListQuery, JswStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

export type JswStockQueryState = {
  page: number
  limit: number
  sortBy: JswStockSortBy
  sortOrder: "asc" | "desc"
  q: string
  // 12 per-field filters — empty string = no filter
  so_sales_org: string
  sales_order_type: string
  distr_chnl: string
  sold_to_party: string
  party_code: string
  ship_to_party: string
  customer: string
  material: string
  sales_office: string
  so_product_form: string
  jsw_grade: string
  nco_declared: string
  // date-range
  dateFrom: string
  dateTo: string
}

/** Dialog discriminated union — view-only (no create/edit/delete actions). */
export type JswStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JswStock }

export interface JswStockTableProps {
  rows: JswStock[]
  /** 'loading' (NOT 'isLoading') — matches established table convention. */
  loading: boolean
  error: string | null
  sortBy: JswStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JswStockSortBy) => void
  onView: (row: JswStock) => void
}

export interface JswStockTableToolbarProps {
  query: JswStockListQuery
  onQueryChange: (patch: Partial<JswStockListQuery>) => void
}

export interface JswStockFiltersProps {
  // one prop per JswStockField value
  so_sales_org: string
  sales_order_type: string
  distr_chnl: string
  sold_to_party: string
  party_code: string
  ship_to_party: string
  customer: string
  material: string
  sales_office: string
  so_product_form: string
  jsw_grade: string
  nco_declared: string
  onFilterChange: (patch: Partial<Pick<JswStockQueryState,
    | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
    | "party_code" | "ship_to_party" | "customer" | "material"
    | "sales_office" | "so_product_form" | "jsw_grade" | "nco_declared"
  >>) => void
  onClearAll: () => void
}

export interface JswStockTablePaginationProps {
  meta: PaginationMeta | null
  /** 'isLoading' (NOT 'loading') — matches established pagination convention. */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export interface ViewJswStockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JswStock | null
}

export interface UseJswStockListResult {
  query: JswStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JswStockSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setFilter: (patch: Partial<Pick<JswStockQueryState,
    | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
    | "party_code" | "ship_to_party" | "customer" | "material"
    | "sales_office" | "so_product_form" | "jsw_grade" | "nco_declared"
  >>) => void
  setDateRange: (dateFrom: string, dateTo: string) => void
  clearFilters: () => void
  rows: JswStock[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  dialog: JswStockDialogState
  openDialog: (d: JswStockDialogState) => void
  closeDialog: () => void
  refetch: () => void
}
```

**Line count estimate: ~105 lines.**

---

## 3. `src/types/settings/jsw-stock-config.ts`

```typescript
/**
 * Settings — JSW Stock Excel config + status types.
 * Mirrors backend JswStockConfigPublic / JswStockStatusPublic schemas.
 */

export interface JswStockConfig {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
  interval_hours: number
  notify_emails: string[]
  updated_at: string | null
}

/** PUT body — all fields required (full config replacement). */
export interface JswStockConfigInput {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string
  end_time: string
  interval_hours: number
  notify_emails: string[]
}

export interface JswStockIngestionRow {
  report_date: string
  status: string        // "pending"|"ingested"|"missing"|"alerted"|"error"
  row_count: number
  found_at: string | null
  created_at: string
}

export interface JswStockStatus {
  enabled: boolean
  last_report_date: string | null
  last_status: string | null
  last_row_count: number | null
  last_found_at: string | null
  last_alerted_at: string | null
  last_error: string | null
  recent: JswStockIngestionRow[]
}
```

**Line count estimate: ~50 lines.**

---

## 4. `src/types/settings/jsw-stock-config-ui.ts`

```typescript
/**
 * Settings — JSW Stock config form + hook prop contracts.
 */
import type { JswStockConfig, JswStockConfigInput, JswStockStatus } from "./jsw-stock-config"

export interface JswStockConfigCardProps {
  config: JswStockConfig | null
  status: JswStockStatus | null
  isLoading: boolean
  isSaving: boolean
  isRunning: boolean
  error: string | null
  onSave: (input: JswStockConfigInput) => Promise<void>
  onRunNow: () => Promise<void>
}

export interface JswStockConfigStatusProps {
  status: JswStockStatus | null
  isLoading: boolean
}

export interface UseJswStockConfigResult {
  config: JswStockConfig | null
  status: JswStockStatus | null
  isLoading: boolean
  isSaving: boolean
  isRunning: boolean
  error: string | null
  save: (input: JswStockConfigInput) => Promise<void>
  runNow: () => Promise<void>
  refetch: () => void
}
```

**Line count estimate: ~40 lines.**

---

## 5. `src/api/client.ts` — add `putData`

Add this block immediately after `patchData` (line ~76 in the current file).
Copy `patchData` exactly, change method to `"PUT"` and export name to `putData`:

```typescript
/** PUT a JSON body and unwrap `data` (full resource replacement). */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}
```

Also add `putData` to the existing JSDoc export comment at the top of `client.ts`:
change the line that reads:
```
 * exports ApiError,getData,postData,patchData,deleteData,getList,buildQuery
```
to:
```
 * exports ApiError,getData,postData,patchData,putData,deleteData,getList,buildQuery
```

---

## 6. `src/api/jsw-stock/list.ts`

```typescript
/** GET /jsw-stock — backend-driven paginated JSW Stock list. */
import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { JswStock, JswStockListQuery } from "@/types/jsw-stock/stock"

function buildParams(
  q: JswStockListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    ...(q.q          ? { q: q.q }                           : {}),
    ...(q.so_sales_org    ? { so_sales_org: q.so_sales_org }         : {}),
    ...(q.sales_order_type ? { sales_order_type: q.sales_order_type } : {}),
    ...(q.distr_chnl      ? { distr_chnl: q.distr_chnl }             : {}),
    ...(q.sold_to_party   ? { sold_to_party: q.sold_to_party }       : {}),
    ...(q.party_code      ? { party_code: q.party_code }             : {}),
    ...(q.ship_to_party   ? { ship_to_party: q.ship_to_party }       : {}),
    ...(q.customer        ? { customer: q.customer }                 : {}),
    ...(q.material        ? { material: q.material }                 : {}),
    ...(q.sales_office    ? { sales_office: q.sales_office }         : {}),
    ...(q.so_product_form ? { so_product_form: q.so_product_form }   : {}),
    ...(q.jsw_grade       ? { jsw_grade: q.jsw_grade }               : {}),
    ...(q.nco_declared    ? { nco_declared: q.nco_declared }         : {}),
    ...(q.dateFrom        ? { dateFrom: q.dateFrom }                 : {}),
    ...(q.dateTo          ? { dateTo: q.dateTo }                     : {}),
  }
}

export function listJswStock(
  query: JswStockListQuery = {},
): Promise<PaginatedResult<JswStock>> {
  return getList<JswStock>(`/jsw-stock${buildQuery(buildParams(query))}`)
}
```

**Line count: ~50 lines.**

---

## 7. `src/api/jsw-stock/options.ts`

```typescript
/**
 * GET /jsw-stock/options — curried factory for per-field async option search.
 *
 * Freeze at module scope in JswStockFilters.tsx:
 *   const FETCHERS = Object.fromEntries(
 *     JSW_STOCK_FILTER_FIELDS.map(f => [f, searchJswStockFieldOptions(f)])
 *   ) as Record<JswStockField, (q: string) => Promise<AsyncOption[]>>
 */
import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { JswStockField } from "@/types/jsw-stock/stock"

export function searchJswStockFieldOptions(
  field: JswStockField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/jsw-stock/options${buildQuery({ field, q, limit: 20 })}`,
    )
}
```

**Line count: ~25 lines.**

---

## 8. `src/api/settings/jsw-stock-config/get.ts`

```typescript
/** GET /admin/jsw-stock/config — load singleton config. */
import { getData } from "@/api/client"
import type { JswStockConfig } from "@/types/settings/jsw-stock-config"

export function getJswStockConfig(): Promise<JswStockConfig> {
  return getData<JswStockConfig>("/admin/jsw-stock/config")
}
```

---

## 9. `src/api/settings/jsw-stock-config/update.ts`

```typescript
/** PUT /admin/jsw-stock/config — full config replacement (upsert singleton). */
import { putData } from "@/api/client"
import type { JswStockConfig, JswStockConfigInput } from "@/types/settings/jsw-stock-config"

export function updateJswStockConfig(
  body: JswStockConfigInput,
): Promise<JswStockConfig> {
  return putData<JswStockConfig>("/admin/jsw-stock/config", body)
}
```

---

## 10. `src/api/settings/jsw-stock-config/status.ts`

```typescript
/** GET /admin/jsw-stock/status — ingestion status + recent runs. */
import { getData } from "@/api/client"
import type { JswStockStatus } from "@/types/settings/jsw-stock-config"

export function getJswStockStatus(): Promise<JswStockStatus> {
  return getData<JswStockStatus>("/admin/jsw-stock/status")
}
```

---

## 11. `src/api/settings/jsw-stock-config/runNow.ts`

```typescript
/** POST /admin/jsw-stock/run-now — trigger an immediate poll cycle. */
import { postData } from "@/api/client"
import type { JswStockStatus } from "@/types/settings/jsw-stock-config"

export function runJswStockCheckNow(): Promise<JswStockStatus> {
  return postData<JswStockStatus>("/admin/jsw-stock/run-now", {})
}
```

---

## Key rules for the builder

- `putData` is the only new helper needed in `client.ts` — add it, do not
  rearrange existing exports.
- Do NOT import `AsyncOption` from `customer-code.ts` — use
  `@/types/admin/options` directly.
- `buildParams` in `list.ts` must strip falsy values via conditional spreads
  (not just `undefined` checks) so empty-string filters are not forwarded.
- `dateFrom` / `dateTo` must forward as-is (ISO-8601 strings) — do not parse
  or reformat on the frontend.
- `JswStockField` Literal order must exactly match the SPEC §1 filter-column
  order: `so_sales_org`, `sales_order_type`, `distr_chnl`, `sold_to_party`,
  `party_code`, `ship_to_party`, `customer`, `material`, `sales_office`,
  `so_product_form`, `jsw_grade`, `nco_declared`.
- Query keys in `buildParams` are snake_case and must match the backend
  `JswStockListQuery` keys exactly — no camelCase aliasing.
- All 72 fields in `JswStock` interface are present (counted in skeleton above:
  72 data fields + 7 meta fields = 79 total properties plus `id`).
- `stock.ts` is the heaviest file at ~140 lines — within the 250-line limit.
- `stock-ui.ts` at ~105 lines — within limit.
- No file in this area approaches 250 lines.
