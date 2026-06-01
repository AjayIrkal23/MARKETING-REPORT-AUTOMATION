# FE: JSW Stock List Page — Implementation Note

> Builder reference for `src/components/jsw-stock/` + `src/pages/jsw-stock/index.tsx`.
> Every skeleton here is validated against the live reference implementations
> (customer-codes domain) and the authoritative SPEC §3. Follow exactly — zero ambiguity.

---

## 0. SPEC corrections / clarifications found

| # | Finding | Correction |
|---|---------|------------|
| C1 | SPEC §3 says `JswStockFilters` is a "shadcn Popover containing a 2-column grid of 12 AsyncCombobox". Reference CustomerCodeFilters is **inline** (no Popover — it renders a React Fragment). For JSW Stock, with 12 fields (vs 6), the Popover design IS correct (12 inline would overflow toolbars). Use the Popover approach as SPEC states. |  Keep Popover — correct for 12. |
| C2 | SPEC §3 Types: `JswStockDialogState` only needs `{type:"none"} | {type:"view"; row: JswStock}`. No create/edit/delete in JSW Stock list. "row" field name used in SPEC — use `row: JswStock` (not `customerCode`). | Confirmed. `row` is correct. |
| C3 | `client.ts` has no `putData`. SPEC §4 wiring requires it. The config builder agent adds it. This file MUST NOT be touched by the stock-list builder — it is wiring-pass scope. | Stock-list builder does NOT add `putData`. |
| C4 | Route is `/jsw-stock` (NOT `/admin/jsw-stock`) — ALL authenticated users, no AdminRoute wrapper. Confirmed by SPEC §0 + App.tsx structure. Page goes inside `<ProtectedRoute>/<DashboardLayout>` but OUTSIDE `<AdminRoute>`. | Confirmed. |
| C5 | Page lives at `src/pages/jsw-stock/index.tsx` (NOT `src/pages/admin/jsw-stock/`). Components live at `src/components/jsw-stock/` (NOT `src/components/admin/jsw-stock/`). | Confirmed — non-admin domain. |
| C6 | `JswStockTableToolbar`: SPEC says "free-text search AsyncCombobox (on `customer` field → sets `q`)". Toolbar uses `customer` field as the type-ahead source (same as customer-codes), but the value becomes `q` (full-text search across 10 fields). `DateRangePicker` maps `dateFrom`/`dateTo` (ISO strings). Confirmed — exactly mirrors customer-codes toolbar. | Confirmed. |
| C7 | `ViewJswStockSheet` has 72 + 7 meta fields = 79 total. Without a config-based renderer, the file will be ~350+ lines. **A `jsw-stock-fields.ts` config is mandatory, not optional.** | Confirmed — split required. |
| C8 | `AsyncCombobox.fetchOptions` signature is `(q: string) => Promise<AsyncOption[]>` (from `@/types/admin/options`). The SPEC's "frozen FETCHERS" rule is validated: `searchJswStockFieldOptions` must be a curried factory (identical pattern to `searchCustomerCodeFieldOptions`). | Confirmed. |
| C9 | `DateRangePicker` props: `from: string|null`, `to: string|null`, `onChange: (range: {from: string|null; to: string|null}) => void`. The hook stores `dateFrom`/`dateTo` as `string|null`. The toolbar maps `range.from → setDateRange({dateFrom, dateTo})`. | Confirmed. |
| C10 | `CustomerCodeTablePagination` uses `isLoading` (NOT `loading`). `CustomerCodeTable` uses `loading` (NOT `isLoading`). **Exact same asymmetry MUST be reproduced** for JSW Stock components. | Table prop = `loading`. Pagination prop = `isLoading`. |

---

## 1. File map (all new files — builder scope only)

```
src/
  types/jsw-stock/
    stock.ts                   ← JswStock, JswStockSortBy, JswStockField, JswStockListQuery
    stock-ui.ts                ← all prop interfaces + UseJswStockListResult

  api/jsw-stock/
    list.ts                    ← listJswStock()
    options.ts                 ← searchJswStockFieldOptions() curried factory

  components/jsw-stock/
    JswStockTable.tsx
    JswStockTableToolbar.tsx
    JswStockFilters.tsx        ← 12-field Popover panel
    JswStockTablePagination.tsx
    ViewJswStockSheet.tsx      ← thin shell; imports jsw-stock-fields config
    jsw-stock-fields.ts        ← MANDATORY config; all 79 fields grouped
    hooks/
      useJswStockList.ts

  pages/jsw-stock/
    index.tsx                  ← JswStockListPage (default export)
```

**Wiring-pass files (DO NOT TOUCH as stock-list builder):**
`src/App.tsx`, `src/components/layout/nav-items.ts`, `src/api/client.ts`

---

## 2. Types

### `src/types/jsw-stock/stock.ts`

```ts
import type { PageQuery, SortOrder } from "@/types/api/envelope"

// 12 filterable fields — exact order per SPEC §1
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

// Sort whitelist — exact order per SPEC §1
export type JswStockSortBy =
  | "created_at" | "report_date" | "customer" | "customer_name"
  | "party_code" | "sold_to_party" | "ship_to_party" | "material"
  | "jsw_grade" | "sales_office" | "so_sales_org" | "sales_order_type"
  | "distr_chnl" | "so_product_form" | "nco_declared" | "batch"
  | "unrestr_qty" | "stock_quantity" | "aging"

export interface JswStock {
  id: string
  // ── Order & SO (text fields)
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
  // ── Quantities (number)
  unrestr_qty: number | null
  in_quality_insp: number | null
  blocked: number | null
  stock_quantity: number | null
  // ── Quality / NCO (text)
  usage_decision: string | null
  nco_declared: string | null
  next_workcenter: string | null
  length_mm: string | null
  nco_reason: string | null
  ud_remarks: string | null
  // ── Aging / Production
  aging: number | null
  production_date: string | null   // ISO datetime string | null
  shift: string | null
  // ── Sales Order detail
  sales_order_no: string | null
  so_item_num: string | null
  order_status: string | null
  // ── Logistics / Export
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
  // ── Mechanical
  ys_in_mpa: number | null
  elongation: string | null
  elongation_mic: number | null
  hardness: string | null
  tensile_strength_mpa_b: number | null
  yield_strength: string | null
  uts: string | null
  // ── Chemistry (%)
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
  // ── Special / CP / LC
  special_stock: string | null
  cp_number: string | null
  cp_end_date: string | null       // ISO datetime string | null
  lc_exp_date: string | null
  route: string | null
  route_desc: string | null
  // ── Mapping + meta
  party_code_normalized: string | null
  customer_name: string | null
  customer_code_id: string | null
  report_date: string              // "dd-mm-yyyy"
  source_file: string | null
  created_at: string               // ISO datetime
  updated_at: string               // ISO datetime
}

export interface JswStockListQuery extends PageQuery {
  sortBy?: JswStockSortBy
  sortOrder?: "asc" | "desc"
  q?: string
  // 12 per-field filters
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
  // date-range (against created_at)
  dateFrom?: string
  dateTo?: string
}
```

### `src/types/jsw-stock/stock-ui.ts`

```ts
import type { JswStock, JswStockListQuery, JswStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

// ── Query state (includes all 12 filter keys as strings)
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
  dateFrom: string | null
  dateTo: string | null
}

// ── Dialog discriminated union (view-only — no create/edit/delete)
export type JswStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JswStock }

// ── Table props (NOTE: `loading` not `isLoading` — matches CustomerCodeTable)
export interface JswStockTableProps {
  rows: JswStock[]
  loading: boolean
  error: string | null
  sortBy: JswStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JswStockSortBy) => void
  onView: (row: JswStock) => void
}

// ── Toolbar props
export interface JswStockTableToolbarProps {
  query: JswStockQueryState
  onQueryChange: (patch: Partial<JswStockListQuery & { dateFrom?: string | null; dateTo?: string | null }>) => void
}

// ── Filters panel props (12 per-field values + callbacks)
export type JswStockFiltersProps = {
  [K in JswStockField]: string
} & {
  onFilterChange: (patch: Partial<Pick<JswStockQueryState, JswStockField>>) => void
  onClearAll: () => void
}

// ── Pagination props (NOTE: `isLoading` not `loading` — matches CustomerCodeTablePagination)
export interface JswStockTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ── View sheet props
export interface ViewJswStockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JswStock | null
}

// ── Hook return contract
export interface UseJswStockListResult {
  query: JswStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JswStockSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setFilter: (patch: Partial<Pick<JswStockQueryState, JswStockField>>) => void
  setDateRange: (range: { dateFrom: string | null; dateTo: string | null }) => void
  clearFilters: () => void
  rows: JswStock[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  dialog: JswStockDialogState
  openDialog: (d: JswStockDialogState) => void
  closeDialog: () => void
  actions: { refetch: () => void }
}
```

---

## 3. API layer

### `src/api/jsw-stock/options.ts`

```ts
// Curried factory — identical pattern to searchCustomerCodeFieldOptions.
// MUST be frozen at module level in consuming components (FETCHERS constant).

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

### `src/api/jsw-stock/list.ts`

```ts
import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { JswStock, JswStockListQuery } from "@/types/jsw-stock/stock"

function buildParams(q: JswStockListQuery): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    ...(q.q          ? { q: q.q }                         : {}),
    ...(q.so_sales_org     ? { so_sales_org: q.so_sales_org }         : {}),
    ...(q.sales_order_type ? { sales_order_type: q.sales_order_type } : {}),
    ...(q.distr_chnl       ? { distr_chnl: q.distr_chnl }             : {}),
    ...(q.sold_to_party    ? { sold_to_party: q.sold_to_party }        : {}),
    ...(q.party_code       ? { party_code: q.party_code }             : {}),
    ...(q.ship_to_party    ? { ship_to_party: q.ship_to_party }        : {}),
    ...(q.customer         ? { customer: q.customer }                 : {}),
    ...(q.material         ? { material: q.material }                 : {}),
    ...(q.sales_office     ? { sales_office: q.sales_office }         : {}),
    ...(q.so_product_form  ? { so_product_form: q.so_product_form }   : {}),
    ...(q.jsw_grade        ? { jsw_grade: q.jsw_grade }               : {}),
    ...(q.nco_declared     ? { nco_declared: q.nco_declared }         : {}),
    // date-range — forward null as absent (buildQuery skips undefined/empty)
    ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}),
    ...(q.dateTo   ? { dateTo: q.dateTo }     : {}),
  }
}

export function listJswStock(
  query: JswStockListQuery = {},
): Promise<PaginatedResult<JswStock>> {
  return getList<JswStock>(`/jsw-stock${buildQuery(buildParams(query))}`)
}
```

---

## 4. `jsw-stock-fields.ts` config (MANDATORY — prevents 250-line breach)

This file eliminates the need to hard-code 79 `<DetailRow>` calls in ViewJswStockSheet. Keep it data-only; zero React imports.

```ts
// src/components/jsw-stock/jsw-stock-fields.ts
// Config driving ViewJswStockSheet — no React, no imports needed.

export type FieldType = "text" | "number" | "datetime" | "date-text"

export interface StockFieldDef {
  key: string        // keyof JswStock
  label: string
  type: FieldType
}

export interface FieldGroup {
  heading: string
  fields: StockFieldDef[]
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    heading: "Order & SO",
    fields: [
      { key: "so_sales_org",      label: "SO Sales Org",      type: "text" },
      { key: "sales_order_type",  label: "Sales Order Type",  type: "text" },
      { key: "distr_chnl",        label: "Distr. Channel",    type: "text" },
      { key: "sales_order_no",    label: "Sales Order No.",   type: "text" },
      { key: "so_item_num",       label: "SO Item Num",       type: "text" },
      { key: "order_status",      label: "Order Status",      type: "text" },
      { key: "so_product_form",   label: "SO Product Form",   type: "text" },
      { key: "so_end_application",label: "SO End Application",type: "text" },
      { key: "scheduled_status",  label: "Scheduled Status",  type: "text" },
      { key: "report_date",       label: "Report Date",       type: "text" },
    ],
  },
  {
    heading: "Customer & Mapping",
    fields: [
      { key: "sold_to_party",         label: "Sold To Party",     type: "text" },
      { key: "party_code",            label: "Party Code",        type: "text" },
      { key: "ship_to_party",         label: "Ship To Party",     type: "text" },
      { key: "customer",              label: "Customer",          type: "text" },
      { key: "sales_office",          label: "Sales Office",      type: "text" },
      { key: "customer_name",         label: "Customer Name",     type: "text" },
      { key: "party_code_normalized", label: "Normalized Code",   type: "text" },
      { key: "customer_code_id",      label: "Customer Code ID",  type: "text" },
    ],
  },
  {
    heading: "Material & Dimensions",
    fields: [
      { key: "material",         label: "Material",         type: "text" },
      { key: "jsw_grade",        label: "JSW Grade",        type: "text" },
      { key: "batch",            label: "Batch",            type: "text" },
      { key: "act_thickness_mm", label: "Act. Thickness mm",type: "text" },
      { key: "width_mm",         label: "Width mm",         type: "text" },
      { key: "length_mm",        label: "Length mm",        type: "text" },
      { key: "special_stock",    label: "Special Stock",    type: "text" },
      { key: "eq_specification", label: "Eq. Specification",type: "text" },
      { key: "eq_sub_grade",     label: "Eq. Sub Grade",    type: "text" },
    ],
  },
  {
    heading: "Quantities",
    fields: [
      { key: "unrestr_qty",    label: "Unrestr. Qty",   type: "number" },
      { key: "in_quality_insp",label: "In Quality Insp",type: "number" },
      { key: "blocked",        label: "Blocked",        type: "number" },
      { key: "stock_quantity", label: "Stock Quantity", type: "number" },
      { key: "aging",          label: "Aging",          type: "number" },
    ],
  },
  {
    heading: "Quality / NCO",
    fields: [
      { key: "usage_decision",   label: "Usage Decision",  type: "text" },
      { key: "nco_declared",     label: "NCO Declared",    type: "text" },
      { key: "nco_reason",       label: "NCO Reason",      type: "text" },
      { key: "ud_remarks",       label: "UD Remarks",      type: "text" },
      { key: "next_workcenter",  label: "Next Workcenter", type: "text" },
      { key: "production_date",  label: "Production Date", type: "datetime" },
      { key: "shift",            label: "Shift",           type: "text" },
      { key: "production_workcenter", label: "Production WC", type: "text" },
    ],
  },
  {
    heading: "Chemistry (%)",
    fields: [
      { key: "s_aluminium_pct",  label: "Al %",  type: "number" },
      { key: "s_boron_pct",      label: "B %",   type: "number" },
      { key: "s_carbon_pct",     label: "C %",   type: "number" },
      { key: "s_chromium_pct",   label: "Cr %",  type: "number" },
      { key: "s_copper_pct",     label: "Cu %",  type: "number" },
      { key: "s_manganese_pct",  label: "Mn %",  type: "number" },
      { key: "s_molybdenum_pct", label: "Mo %",  type: "number" },
      { key: "s_nickel_pct",     label: "Ni %",  type: "number" },
      { key: "s_niobium_pct",    label: "Nb %",  type: "number" },
      { key: "s_phosphorus_pct", label: "P %",   type: "number" },
      { key: "s_silicon_pct",    label: "Si %",  type: "number" },
      { key: "s_sulphur_pct",    label: "S %",   type: "number" },
      { key: "s_titanium_pct",   label: "Ti %",  type: "number" },
      { key: "s_vanadium_pct",   label: "V %",   type: "number" },
    ],
  },
  {
    heading: "Mechanical",
    fields: [
      { key: "ys_in_mpa",             label: "YS (MPa)",         type: "number" },
      { key: "elongation",            label: "Elongation",       type: "text"   },
      { key: "elongation_mic",        label: "Elongation (Mic)", type: "number" },
      { key: "hardness",              label: "Hardness",         type: "text"   },
      { key: "tensile_strength_mpa_b",label: "Tensile (MPa B)",  type: "number" },
      { key: "yield_strength",        label: "Yield Strength",   type: "text"   },
      { key: "uts",                   label: "UTS",              type: "text"   },
    ],
  },
  {
    heading: "Logistics / Export",
    fields: [
      { key: "location",             label: "Location",         type: "text" },
      { key: "str_no",               label: "STR No.",          type: "text" },
      { key: "sto_no",               label: "STO No.",          type: "text" },
      { key: "do_no",                label: "DO No.",           type: "text" },
      { key: "shipment",             label: "Shipment",         type: "text" },
      { key: "storage_location",     label: "Storage Location", type: "text" },
      { key: "port_name",            label: "Port Name",        type: "text" },
      { key: "unloading_point",      label: "Unloading Point",  type: "text" },
      { key: "recieving_point",      label: "Receiving Point",  type: "text" },
      { key: "purchase_order_number",label: "PO Number",        type: "text" },
      { key: "route",                label: "Route",            type: "text" },
      { key: "route_desc",           label: "Route Desc",       type: "text" },
      { key: "cp_number",            label: "CP Number",        type: "text" },
      { key: "cp_end_date",          label: "CP End Date",      type: "datetime" },
      { key: "lc_exp_date",          label: "LC Exp Date",      type: "date-text" },
    ],
  },
  {
    heading: "Meta",
    fields: [
      { key: "source_file", label: "Source File", type: "text" },
      { key: "created_at",  label: "Created",     type: "datetime" },
      { key: "updated_at",  label: "Updated",     type: "datetime" },
    ],
  },
]
```

> `"date-text"` type = the field is stored as a `dd.mm.yyyy` text string — render verbatim, not via date-fns.

---

## 5. `useJswStockList.ts` hook

Mirror of `useCustomerCodeManagement.ts`. Key differences: 12 filter keys (vs 7), `dateFrom`/`dateTo` state, no mutation actions (read-only).

```ts
// src/components/jsw-stock/hooks/useJswStockList.ts

import { useCallback, useEffect, useRef, useState } from "react"
import { listJswStock } from "@/api/jsw-stock/list"
import type { PaginationMeta } from "@/types/api/envelope"
import type { JswStock, JswStockListQuery, JswStockSortBy } from "@/types/jsw-stock/stock"
import type {
  JswStockDialogState,
  JswStockQueryState,
  UseJswStockListResult,
} from "@/types/jsw-stock/stock-ui"
import type { JswStockField } from "@/types/jsw-stock/stock"

const DEFAULT_QUERY: JswStockQueryState = {
  page: 1, limit: 20, sortBy: "created_at", sortOrder: "desc", q: "",
  so_sales_org: "", sales_order_type: "", distr_chnl: "", sold_to_party: "",
  party_code: "", ship_to_party: "", customer: "", material: "",
  sales_office: "", so_product_form: "", jsw_grade: "", nco_declared: "",
  dateFrom: null, dateTo: null,
}

const FILTER_KEYS = [
  "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
  "party_code", "ship_to_party", "customer", "material",
  "sales_office", "so_product_form", "jsw_grade", "nco_declared",
] as const satisfies ReadonlyArray<JswStockField>

export function useJswStockList(): UseJswStockListResult {
  const [query, setQuery] = useState<JswStockQueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<JswStock[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<JswStockDialogState>({ type: "none" })
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: JswStockQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: JswStockListQuery = {
        page: q.page, limit: q.limit, sortBy: q.sortBy, sortOrder: q.sortOrder,
        ...(q.q              ? { q: q.q }                             : {}),
        ...(q.so_sales_org   ? { so_sales_org: q.so_sales_org }       : {}),
        ...(q.sales_order_type ? { sales_order_type: q.sales_order_type } : {}),
        ...(q.distr_chnl     ? { distr_chnl: q.distr_chnl }           : {}),
        ...(q.sold_to_party  ? { sold_to_party: q.sold_to_party }     : {}),
        ...(q.party_code     ? { party_code: q.party_code }           : {}),
        ...(q.ship_to_party  ? { ship_to_party: q.ship_to_party }     : {}),
        ...(q.customer       ? { customer: q.customer }               : {}),
        ...(q.material       ? { material: q.material }               : {}),
        ...(q.sales_office   ? { sales_office: q.sales_office }       : {}),
        ...(q.so_product_form? { so_product_form: q.so_product_form } : {}),
        ...(q.jsw_grade      ? { jsw_grade: q.jsw_grade }             : {}),
        ...(q.nco_declared   ? { nco_declared: q.nco_declared }       : {}),
        ...(q.dateFrom       ? { dateFrom: q.dateFrom }               : {}),
        ...(q.dateTo         ? { dateTo: q.dateTo }                   : {}),
      }
      const result = await listJswStock(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load JSW stock data. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  const setPage     = useCallback((page: number)  => setQuery((q) => ({ ...q, page })), [])
  const setLimit    = useCallback((limit: number) => setQuery((q) => ({ ...q, limit, page: 1 })), [])
  const setSort     = useCallback((sortBy: JswStockSortBy, sortOrder: "asc" | "desc") =>
    setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })), [])
  const setSearch   = useCallback((s: string) => setQuery((q) => ({ ...q, q: s, page: 1 })), [])
  const setFilter   = useCallback(
    (patch: Partial<Pick<JswStockQueryState, JswStockField>>) =>
      setQuery((q) => ({ ...q, ...patch, page: 1 })), [])
  const setDateRange = useCallback(
    (range: { dateFrom: string | null; dateTo: string | null }) =>
      setQuery((q) => ({ ...q, ...range, page: 1 })), [])

  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_KEYS.map((k) => [k, ""]),
    ) as Pick<JswStockQueryState, typeof FILTER_KEYS[number]>
    setQuery((q) => ({ ...q, ...cleared, dateFrom: null, dateTo: null, page: 1 }))
  }, [])

  const refetch     = useCallback(() => setQuery((q) => ({ ...q })), [])
  const openDialog  = useCallback((d: JswStockDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  return {
    query, setPage, setLimit, setSort, setSearch, setFilter,
    setDateRange, clearFilters,
    rows, meta, loading, error,
    dialog, openDialog, closeDialog,
    actions: { refetch },
  }
}
```

---

## 6. `JswStockTable.tsx`

Visible columns: **Report Date · Party Code · Customer · Customer Name · Sold To Party · Material · JSW Grade · Sales Office · Distr.Chnl · Unrestr Qty · Stock Qty · [actions]** (12 data cols + actions).

Sortable columns (those in `JswStockSortBy`): `report_date`, `party_code`, `customer`, `customer_name`, `sold_to_party`, `material`, `jsw_grade`, `sales_office`, `distr_chnl`, `unrestr_qty` (mapped to `unrestr_qty` in sort), `stock_quantity`, `created_at`.

```ts
// src/components/jsw-stock/JswStockTable.tsx
// ~180 lines — safe under 250 with 12 skeleton cells

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ArrowUpDown, Boxes, AlertCircle, EyeIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JswStockSortBy } from "@/types/jsw-stock/stock"
import type { JswStockTableProps } from "@/types/jsw-stock/stock-ui"

// SortableHead — copy pattern from CustomerCodeTable.tsx verbatim (generic over JswStockSortBy)

const SKELETON_ROWS = 8

// Column skeleton widths (12 data + actions)
const SKELETON_WIDTHS = ["w-20","w-24","w-40","w-36","w-32","w-32","w-28","w-28","w-20","w-16","w-16",""]

export function JswStockTable({
  rows, loading, error, sortBy, sortOrder, onSort, onView,
}: JswStockTableProps) {
  if (loading) { /* 8 skeleton rows, 13 cells each */ }
  if (error)   { /* AlertCircle block — same pattern as CustomerCodeTable */ }
  if (rows.length === 0) {
    // <Boxes className="size-8 opacity-40"> + "No stock records found"
  }

  // Data table columns (in order):
  // SortableHead: Report Date (col="report_date")
  // SortableHead: Party Code (col="party_code")
  // SortableHead: Customer (col="customer")
  // SortableHead: Customer Name (col="customer_name") — italic "—" when null
  // SortableHead: Sold To Party (col="sold_to_party")
  // SortableHead: Material (col="material")
  // SortableHead: JSW Grade (col="jsw_grade")
  // SortableHead: Sales Office (col="sales_office")
  // SortableHead: Distr.Chnl (col="distr_chnl")
  // SortableHead: Unrestr Qty (col="unrestr_qty") — tabular-nums
  // SortableHead: Stock Qty (col="stock_quantity") — tabular-nums
  // TableHead: "" (actions, w-10)

  // Row: date format report_date verbatim (already "dd-mm-yyyy").
  // Customer Name cell: row.customer_name ?? <span className="italic text-muted-foreground/60">—</span>
  // Quantities: toLocaleString() or "—" when null.
  // Actions: <Button variant="ghost" size="icon" onClick={() => onView(row)}><EyeIcon /></Button>
}
```

**Important:** `report_date` is a plain string (`"dd-mm-yyyy"`) — render verbatim, not via date-fns. `created_at` is not shown in the table; it is only used for sort/date-range filter.

---

## 7. `JswStockFilters.tsx` — Popover with 12 comboboxes

The 12-field count makes inline rendering impractical (toolbar overflow). Use a Popover trigger with an active-count Badge, matching the SPEC description.

```ts
// src/components/jsw-stock/JswStockFilters.tsx
// ~150 lines

import { useState } from "react"
import { SlidersHorizontalIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchJswStockFieldOptions } from "@/api/jsw-stock/options"
import type { JswStockField } from "@/types/jsw-stock/stock"
import type { JswStockFiltersProps } from "@/types/jsw-stock/stock-ui"

// ── Field config ────────────────────────────────────────────────────────────

interface FieldFilterConfig {
  field: JswStockField
  label: string
  placeholder: string
}

const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "so_sales_org",     label: "SO Sales Org",     placeholder: "Any sales org…"     },
  { field: "sales_order_type", label: "Sales Order Type", placeholder: "Any order type…"    },
  { field: "distr_chnl",       label: "Distr. Channel",   placeholder: "Any channel…"       },
  { field: "sold_to_party",    label: "Sold To Party",    placeholder: "Any sold-to…"       },
  { field: "party_code",       label: "Party Code",       placeholder: "Any party code…"    },
  { field: "ship_to_party",    label: "Ship To Party",    placeholder: "Any ship-to…"       },
  { field: "customer",         label: "Customer",         placeholder: "Any customer…"      },
  { field: "material",         label: "Material",         placeholder: "Any material…"      },
  { field: "sales_office",     label: "Sales Office",     placeholder: "Any sales office…"  },
  { field: "so_product_form",  label: "SO Product Form",  placeholder: "Any product form…"  },
  { field: "jsw_grade",        label: "JSW Grade",        placeholder: "Any JSW grade…"     },
  { field: "nco_declared",     label: "NCO Declared",     placeholder: "Any NCO value…"     },
]

// ── FETCHERS — frozen at module level (referential stability rule) ───────────
// NEVER define inside the component. Each call to searchJswStockFieldOptions()
// returns a new function reference; this constant ensures AsyncCombobox's
// useAsyncOptions never sees a changed fetcher and re-fetches spuriously.

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchJswStockFieldOptions(field)]),
) as Record<JswStockField, (q: string) => Promise<{ value: string; label: string }[]>>

// ── Active count helper ──────────────────────────────────────────────────────

function countActive(props: JswStockFiltersProps): number {
  return FIELD_FILTERS.filter(({ field }) => !!props[field]).length
}

// ── Component ────────────────────────────────────────────────────────────────

export function JswStockFilters(props: JswStockFiltersProps) {
  const [open, setOpen] = useState(false)
  const { onFilterChange, onClearAll } = props
  const activeCount = countActive(props)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontalIcon className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[520px] p-4"   // 2-column grid needs ~520px
        align="start"
        sideOffset={4}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Filters</span>
          {activeCount > 0 && (
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => { onClearAll(); setOpen(false) }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_FILTERS.map(({ field, label, placeholder }) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <AsyncCombobox
                value={props[field] || null}
                onChange={(value) => onFilterChange({ [field]: value ?? "" } as Partial<Pick<typeof props, JswStockField>>)}
                fetchOptions={FETCHERS[field]}
                placeholder={placeholder}
                emptyText={`No ${label.toLowerCase()} options.`}
                allowClear
                aria-label={`Filter by ${label}`}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

---

## 8. `JswStockTableToolbar.tsx`

```ts
// src/components/jsw-stock/JswStockTableToolbar.tsx
// ~90 lines

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { DateRangePicker } from "@/components/common/DateRangePicker"
import { JswStockFilters } from "./JswStockFilters"
import { searchJswStockFieldOptions } from "@/api/jsw-stock/options"
import type { JswStockTableToolbarProps } from "@/types/jsw-stock/stock-ui"

// Frozen at module level — referential stability for useAsyncOptions
const fetchCustomerOptions = searchJswStockFieldOptions("customer")

export function JswStockTableToolbar({ query, onQueryChange }: JswStockTableToolbarProps) {
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  return (
    <div role="toolbar" aria-label="JSW stock table filters" className="flex flex-wrap items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Free-text search via customer field type-ahead */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q || null}
            onChange={(value) => applyFilter({ q: value ?? undefined })}
            fetchOptions={fetchCustomerOptions}
            placeholder="Search stock records…"
            emptyText="No matches found."
            allowClear
            aria-label="Search JSW stock records"
          />
        </div>

        {/* Date-range filter against created_at */}
        <DateRangePicker
          from={query.dateFrom}
          to={query.dateTo}
          onChange={(range) => applyFilter({ dateFrom: range.from ?? undefined, dateTo: range.to ?? undefined })}
          placeholder="Ingestion date range"
          aria-label="Filter by ingestion date range"
        />

        {/* 12-field Filters popover */}
        <JswStockFilters
          so_sales_org={query.so_sales_org}
          sales_order_type={query.sales_order_type}
          distr_chnl={query.distr_chnl}
          sold_to_party={query.sold_to_party}
          party_code={query.party_code}
          ship_to_party={query.ship_to_party}
          customer={query.customer}
          material={query.material}
          sales_office={query.sales_office}
          so_product_form={query.so_product_form}
          jsw_grade={query.jsw_grade}
          nco_declared={query.nco_declared}
          onFilterChange={(patch) => applyFilter(patch)}
          onClearAll={() => applyFilter({
            so_sales_org: "", sales_order_type: "", distr_chnl: "", sold_to_party: "",
            party_code: "", ship_to_party: "", customer: "", material: "",
            sales_office: "", so_product_form: "", jsw_grade: "", nco_declared: "",
          })}
        />
      </div>
    </div>
  )
}
```

**DateRangePicker `onChange` note:** The picker emits `{from: string|null, to: string|null}`. Map to `dateFrom`/`dateTo` in `applyFilter`. Pass `undefined` (not `null`) to strip from buildQuery, since `buildQuery` skips `undefined` and `""` but not `null`.

**Correction to SPEC:** The SPEC says `dateFrom`/`dateTo` passed to `applyFilter` — but `buildQuery` in `client.ts` only strips `undefined | ""`. Pass `value ?? undefined` to ensure `null` values become `undefined` and are stripped from the query string.

---

## 9. `JswStockTablePagination.tsx`

```ts
// Exact mirror of CustomerCodeTablePagination.tsx
// Change only: label "stock row" / "stock rows", remove page-size 50 is fine (keep 10/20/50)
// Props: JswStockTablePaginationProps (isLoading, not loading)
```

Copy `CustomerCodeTablePagination.tsx` verbatim, replace:
- `CustomerCodeTablePaginationProps` → `JswStockTablePaginationProps`
- `"customer code"` / `"customer codes"` → `"stock row"` / `"stock rows"`
- Import path to `@/types/jsw-stock/stock-ui`

---

## 10. `ViewJswStockSheet.tsx`

With `jsw-stock-fields.ts`, this file stays well under 250 lines:

```ts
// src/components/jsw-stock/ViewJswStockSheet.tsx
// ~110 lines

import { format, parseISO } from "date-fns"
import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { FIELD_GROUPS, type FieldType } from "./jsw-stock-fields"
import type { ViewJswStockSheetProps } from "@/types/jsw-stock/stock-ui"
import type { JswStock } from "@/types/jsw-stock/stock"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm") } catch { return iso }
}

function renderValue(val: unknown, type: FieldType): string {
  if (val === null || val === undefined || val === "") return "—"
  if (type === "datetime") return formatTs(String(val))
  if (type === "date-text") return String(val)   // verbatim "dd.mm.yyyy"
  if (type === "number") return typeof val === "number" ? val.toLocaleString() : String(val)
  return String(val)
}

// ── Shared sub-components (inline — too small to split) ──────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-x-3 py-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5 truncate">
        {label}
      </span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ViewJswStockSheet({ open, onOpenChange, row }: ViewJswStockSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-lg" aria-label="JSW stock details">
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{row?.customer ?? "Stock Record"}</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {row ? `Party: ${row.party_code ?? "—"} · ${row.report_date}` : "No record selected"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {row == null ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-6">
            No stock record selected.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {FIELD_GROUPS.map((group, gi) => (
              <div key={group.heading}>
                {gi > 0 && <Separator className="my-3" />}
                <SectionHeading>{group.heading}</SectionHeading>
                {group.fields.map(({ key, label, type }) => (
                  <DetailRow
                    key={key}
                    label={label}
                    value={renderValue((row as unknown as Record<string, unknown>)[key], type)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

---

## 11. `src/pages/jsw-stock/index.tsx`

```ts
// src/pages/jsw-stock/index.tsx
// ~80 lines — thin orchestrator, zero business logic

import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useJswStockList } from "@/components/jsw-stock/hooks/useJswStockList"
import { JswStockTableToolbar } from "@/components/jsw-stock/JswStockTableToolbar"
import { JswStockTable } from "@/components/jsw-stock/JswStockTable"
import { JswStockTablePagination } from "@/components/jsw-stock/JswStockTablePagination"
import { ViewJswStockSheet } from "@/components/jsw-stock/ViewJswStockSheet"
import type { JswStockSortBy } from "@/types/jsw-stock/stock"
import type { JswStockListQuery } from "@/types/jsw-stock/stock"

export function JswStockListPage() {
  const {
    query, setPage, setLimit, setSort, setSearch,
    setFilter, setDateRange, clearFilters, refetch,
    rows, meta, loading, error,
    dialog, openDialog, closeDialog,
    actions,
  } = useJswStockList()

  function handleQueryChange(patch: Partial<JswStockListQuery & { dateFrom?: string | null; dateTo?: string | null }>) {
    if ("q" in patch) setSearch(patch.q ?? "")
    if (patch.page  !== undefined) setPage(patch.page)
    if (patch.limit !== undefined) setLimit(patch.limit)
    if ("dateFrom" in patch || "dateTo" in patch) {
      setDateRange({ dateFrom: patch.dateFrom ?? null, dateTo: patch.dateTo ?? null })
    }
    // 12 filter keys
    const filterKeys: JswStockField[] = [
      "so_sales_org","sales_order_type","distr_chnl","sold_to_party",
      "party_code","ship_to_party","customer","material",
      "sales_office","so_product_form","jsw_grade","nco_declared",
    ]
    const filterPatch: Record<string, string> = {}
    let hasFilter = false
    for (const key of filterKeys) {
      if (key in patch) { filterPatch[key] = (patch as Record<string,string>)[key] ?? ""; hasFilter = true }
    }
    if (hasFilter) setFilter(filterPatch as Parameters<typeof setFilter>[0])
  }

  function handleSortChange(col: JswStockSortBy) {
    const nextOrder = query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  const isView = dialog.type === "view"

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Boxes className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">JSW Stock List</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Server-driven view of SAP current stock data (ZSD_CURRSTK_HR).
          </p>
        </div>
      </div>

      <Separator />

      <JswStockTableToolbar query={query} onQueryChange={handleQueryChange} />

      <JswStockTable
        rows={rows} loading={loading} error={error}
        sortBy={query.sortBy} sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(row) => openDialog({ type: "view", row })}
      />

      <JswStockTablePagination
        meta={meta} isLoading={loading}
        onPageChange={setPage} onLimitChange={setLimit}
      />

      <ViewJswStockSheet
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        row={isView ? dialog.row : null}
      />
    </div>
  )
}
```

> Named export `JswStockListPage` — imported by `App.tsx` wiring pass.

---

## 12. Line-count risk assessment

| File | Estimated lines | Risk |
|------|----------------|------|
| `jsw-stock-fields.ts` | ~130 | Safe |
| `useJswStockList.ts` | ~110 | Safe |
| `JswStockTable.tsx` | ~185 | Safe (skeleton has 13 cells × 8 rows but loopable) |
| `JswStockFilters.tsx` | ~150 | Safe |
| `JswStockTableToolbar.tsx` | ~70 | Safe |
| `JswStockTablePagination.tsx` | ~150 | Safe (mirror of reference) |
| `ViewJswStockSheet.tsx` | ~110 | **Safe ONLY because of jsw-stock-fields.ts** |
| `stock.ts` (types) | ~90 | Safe |
| `stock-ui.ts` (types) | ~90 | Safe |
| `pages/jsw-stock/index.tsx` | ~80 | Safe |

Without `jsw-stock-fields.ts`, `ViewJswStockSheet` would be ~380 lines — a confirmed 250-line breach.

---

## 13. Critical rules summary for builder

1. **FETCHERS constant at module level** in `JswStockFilters.tsx` — never inside the component function.
2. **Table prop is `loading`** (boolean), **Pagination prop is `isLoading`** (boolean). Do not swap.
3. **`q` in toolbar** maps to free-text search across 10 BE fields — the `customer` field is only the type-ahead source, not the filter field.
4. **`dateFrom`/`dateTo`** sent as ISO strings (`null` → omit from query via `undefined`). `buildQuery` in `client.ts` skips `undefined` and `""` but NOT `null` — always coerce `null → undefined` before passing to `buildQuery`.
5. **`report_date`** render verbatim (`"dd-mm-yyyy"` string) in table. Use `formatTs(parseISO(...))` only for `created_at`/`updated_at`/`production_date`/`cp_end_date` (ISO datetimes).
6. **No `putData` added here** — that is wiring-pass scope.
7. **No Admin route wrapping** — `/jsw-stock` is ProtectedRoute only.
8. **No import from `src/pages/admin/` or `src/components/admin/`** — JSW Stock is its own non-admin domain.
9. **`clearFilters` also clears `dateFrom`/`dateTo`** — the hook `clearFilters` resets both to `null`. The toolbar `onClearAll` prop mirrors this.
10. **Dialog union** has only `{type:"none"}` and `{type:"view"; row: JswStock}` — no create/edit/delete variants for this read-only list.
