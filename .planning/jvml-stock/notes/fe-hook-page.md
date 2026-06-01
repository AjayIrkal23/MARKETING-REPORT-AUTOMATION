# fe-hook-page.md — JVML Stock: hook + page builder packet

> Builder-ready. Exact import paths, signatures, ready-to-paste code blocks.
> Reference implementation: `customer-codes` + `audit-logs`. Read this before touching any file.

---

## 1. Files the builder creates

| File | Lines est. |
|------|-----------|
| `src/types/jvml-stock/stock-ui.ts` | ~120 |
| `src/components/jvml-stock/hooks/useJvmlStockList.ts` | ~170 |
| `src/pages/jvml-stock/index.tsx` | ~130 |

The types file MUST exist before the hook. The hook MUST exist before the page.

---

## 2. Confirmed import paths (real files, verified)

```ts
// API client helpers (all already exported from client.ts)
import { buildQuery, getList } from "@/api/client"
// getData, postData, patchData, deleteData also exported — putData is NOT yet present
// (ORCHESTRATOR adds putData — see SPEC §4 item 9). Builder may assume it will exist.

// Envelope types
import type { PaginationMeta, PaginatedResult, PageQuery } from "@/types/api/envelope"

// Domain API (builder creates these — see fe-types-api.md notes)
import { listJvmlStock } from "@/api/jvml-stock/list"

// Hook's own types (builder creates stock-ui.ts first)
import type {
  JvmlStockQueryState,
  JvmlStockDialogState,
  UseJvmlStockListResult,
} from "@/types/jvml-stock/stock-ui"
import type { JvmlStock, JvmlStockListQuery, JvmlStockSortBy } from "@/types/jvml-stock/stock"

// React
import { useCallback, useEffect, useRef, useState } from "react"
```

---

## 3. `src/types/jvml-stock/stock-ui.ts` — complete spec

Mirror `customer-code-ui.ts` shape exactly. Key differences:
- No mutations (no `remove`, no `actions` object with mutations) — list page is read-only.
- Dialog union is simpler: `{type:"none"} | {type:"view"; row: JvmlStock}`.
- Table prop is `loading: boolean` (NOT `isLoading`).
- Pagination prop is `isLoading: boolean` (NOT `loading`) — same asymmetry as customer-codes.
- 10 filter fields replace 7 customer-code filter fields.
- Adds `dateFrom`/`dateTo` to query state.

```ts
// src/types/jvml-stock/stock-ui.ts

import type { JvmlStock, JvmlStockListQuery, JvmlStockSortBy, JvmlStockField } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

export type JvmlStockQueryState = {
  page: number
  limit: number
  sortBy: JvmlStockSortBy
  sortOrder: "asc" | "desc"
  q: string
  // 10 per-field filters (JvmlStockField values) — empty string = no filter
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
  // Date-range filter on created_at (ISO-8601 strings)
  dateFrom: string
  dateTo: string
}

// ---------------------------------------------------------------------------
// Dialog discriminated union
// ---------------------------------------------------------------------------

export type JvmlStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JvmlStock }

// ---------------------------------------------------------------------------
// Hook return contract
// ---------------------------------------------------------------------------

export interface UseJvmlStockListResult {
  query: JvmlStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JvmlStockSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  /** Single setter for all 10 per-field filters + dateFrom/dateTo. Resets page to 1. */
  setFilter: (patch: Partial<Pick<JvmlStockQueryState,
    | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
    | "customer" | "material" | "sales_office" | "so_product_form"
    | "jsw_grade" | "nco_declared">>) => void
  setDateRange: (dateFrom: string, dateTo: string) => void
  clearFilters: () => void
  refetch: () => void
  rows: JvmlStock[]
  meta: PaginationMeta | null
  loading: boolean      // table prop name (NOT isLoading)
  error: string | null
  dialog: JvmlStockDialogState
  openDialog: (d: JvmlStockDialogState) => void
  closeDialog: () => void
}

// ---------------------------------------------------------------------------
// Component prop interfaces
// ---------------------------------------------------------------------------

export interface JvmlStockTableProps {
  rows: JvmlStock[]
  loading: boolean          // named 'loading' — NOT 'isLoading'
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
  // 10 filter values
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
  isLoading: boolean        // named 'isLoading' — NOT 'loading'
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export interface ViewJvmlStockSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JvmlStock | null
}
```

---

## 4. `useJvmlStockList.ts` — complete ready-to-paste implementation

Path: `src/components/jvml-stock/hooks/useJvmlStockList.ts`

Key patterns copied exactly from `useCustomerCodeManagement.ts`:
- `fetchIdRef = useRef(0)` + `id = ++fetchIdRef.current` guards stale responses
- `if (id !== fetchIdRef.current) return` checked in both try/catch and finally
- `useEffect(() => { void doFetch(query) }, [doFetch, query])` drives fetches
- `setQuery((q) => ({ ...q }))` triggers refetch without param change
- All filter/search setters reset page to 1

```ts
// src/components/jvml-stock/hooks/useJvmlStockList.ts
/**
 * useJvmlStockList — all query + server state for the JVML Stock list page.
 *
 * Owns query params {page,limit,sortBy,sortOrder,q, 10 filters, dateFrom,dateTo},
 * server state {rows,meta,loading,error}, dialog union, and all setters.
 * ALL filtering/sorting/pagination is server-driven via API params.
 * fetchIdRef guards against stale responses from superseded fetches.
 * setFilter + setDateRange reset page to 1 automatically.
 *
 * Contract: .planning/jvml-stock/SPEC.md §3
 */

import { useCallback, useEffect, useRef, useState } from "react"

import { listJvmlStock } from "@/api/jvml-stock/list"

import type { PaginationMeta } from "@/types/api/envelope"
import type { JvmlStock, JvmlStockListQuery, JvmlStockSortBy } from "@/types/jvml-stock/stock"
import type {
  JvmlStockDialogState,
  JvmlStockQueryState,
  UseJvmlStockListResult,
} from "@/types/jvml-stock/stock-ui"

// ---------------------------------------------------------------------------
// Default query state
// ---------------------------------------------------------------------------

const DEFAULT_QUERY: JvmlStockQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  q: "",
  so_sales_org: "",
  sales_order_type: "",
  distr_chnl: "",
  sold_to_party: "",
  customer: "",
  material: "",
  sales_office: "",
  so_product_form: "",
  jsw_grade: "",
  nco_declared: "",
  dateFrom: "",
  dateTo: "",
}

// ---------------------------------------------------------------------------
// Filter key set — used by clearFilters to reset per-field filters only.
// dateFrom/dateTo are cleared separately via setDateRange("","").
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
  "customer", "material", "sales_office", "so_product_form",
  "jsw_grade", "nco_declared",
] as const satisfies ReadonlyArray<keyof JvmlStockQueryState>

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJvmlStockList(): UseJvmlStockListResult {
  const [query, setQuery] = useState<JvmlStockQueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<JvmlStock[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<JvmlStockDialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: JvmlStockQueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      // Strip empty strings — backend rejects unknown keys and treats "" as active filter.
      const params: JvmlStockListQuery = {
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
      const result = await listJvmlStock(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load JVML stock data. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Refetch whenever query object identity changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // ---------------------------------------------------------------------------
  // Param setters
  // ---------------------------------------------------------------------------

  const setPage = useCallback(
    (page: number) => setQuery((q) => ({ ...q, page })),
    [],
  )

  const setLimit = useCallback(
    (limit: number) => setQuery((q) => ({ ...q, limit, page: 1 })),
    [],
  )

  const setSort = useCallback(
    (sortBy: JvmlStockSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )

  const setSearch = useCallback(
    (s: string) => setQuery((q) => ({ ...q, q: s, page: 1 })),
    [],
  )

  /**
   * Single setter for all 10 per-field filters. Resets page to 1 on every call.
   * Do NOT add individual per-filter setters — this is the only entry point.
   */
  const setFilter = useCallback(
    (
      patch: Partial<Pick<JvmlStockQueryState,
        | "so_sales_org" | "sales_order_type" | "distr_chnl" | "sold_to_party"
        | "customer" | "material" | "sales_office" | "so_product_form"
        | "jsw_grade" | "nco_declared">>,
    ) => setQuery((q) => ({ ...q, ...patch, page: 1 })),
    [],
  )

  /** Set or clear the date-range. Pass empty strings to clear. Resets page to 1. */
  const setDateRange = useCallback(
    (dateFrom: string, dateTo: string) =>
      setQuery((q) => ({ ...q, dateFrom, dateTo, page: 1 })),
    [],
  )

  /** Reset all 10 per-field filters AND dateFrom/dateTo; reset page to 1. */
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_KEYS.map((k) => [k, ""]),
    ) as Pick<JvmlStockQueryState, typeof FILTER_KEYS[number]>
    setQuery((q) => ({ ...q, ...cleared, dateFrom: "", dateTo: "", page: 1 }))
  }, [])

  // Trigger a re-fetch without changing params.
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: JvmlStockDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  return {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilter,
    setDateRange,
    clearFilters,
    refetch,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
  }
}
```

---

## 5. `src/pages/jvml-stock/index.tsx` — complete ready-to-paste implementation

Wiring pattern copied exactly from `CustomerCodeManagementPage`:
- `handleQueryChange` maps a `Partial<JvmlStockListQuery>` patch to granular hook setters
- `handleSortChange` toggles `sortOrder` on same-column click, defaults to `"asc"` for new column
- All dialogs/sheets driven by the `dialog` discriminated union from the hook
- Zero business logic in the page — thin orchestrator only

```tsx
// src/pages/jvml-stock/index.tsx
/**
 * JvmlStockListPage — thin orchestrator for the JVML Stock list screen.
 *
 * Layout:
 *   Page header (Boxes icon chip + "JVML Stock List" + subtitle)
 *   └─ JvmlStockTableToolbar  (search + date-range + filters popover)
 *   └─ JvmlStockTable         (server-driven sortable table)
 *   └─ JvmlStockTablePagination
 *   └─ ViewJvmlStockSheet     (side sheet for row detail)
 *
 * All state lives in useJvmlStockList. This component contains zero business logic.
 *
 * Contract: .planning/jvml-stock/SPEC.md §3
 * Route:    /jvml-stock  (inside ProtectedRoute + DashboardLayout, NOT AdminRoute)
 */

import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useJvmlStockList } from "@/components/jvml-stock/hooks/useJvmlStockList"
import { JvmlStockTableToolbar } from "@/components/jvml-stock/JvmlStockTableToolbar"
import { JvmlStockTable } from "@/components/jvml-stock/JvmlStockTable"
import { JvmlStockTablePagination } from "@/components/jvml-stock/JvmlStockTablePagination"
import { ViewJvmlStockSheet } from "@/components/jvml-stock/ViewJvmlStockSheet"

import type { JvmlStockListQuery, JvmlStockSortBy } from "@/types/jvml-stock/stock"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function JvmlStockListPage() {
  const {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilter,
    setDateRange,
    clearFilters,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
  } = useJvmlStockList()

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // JvmlStockTableToolbar fires a Partial<JvmlStockListQuery> patch; map it to
  // the granular hook setters.
  function handleQueryChange(patch: Partial<JvmlStockListQuery>) {
    if ("q" in patch) setSearch(patch.q ?? "")
    if (patch.page  !== undefined) setPage(patch.page)
    if (patch.limit !== undefined) setLimit(patch.limit)
    if ("dateFrom" in patch || "dateTo" in patch) {
      setDateRange(patch.dateFrom ?? query.dateFrom, patch.dateTo ?? query.dateTo)
    }

    // Per-field filters
    const filterKeys = [
      "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
      "customer", "material", "sales_office", "so_product_form",
      "jsw_grade", "nco_declared",
    ] as const
    const filterPatch: Partial<typeof query> = {}
    let hasFilter = false
    for (const key of filterKeys) {
      if (key in patch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(filterPatch as any)[key] = (patch as any)[key] ?? ""
        hasFilter = true
      }
    }
    if (hasFilter) setFilter(filterPatch)
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  function handleSortChange(col: JvmlStockSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Boxes className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            JVML Stock List
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Server-driven paginated view of ingested JVML stock records.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (search + date-range + filters) ───────────────── */}
      <JvmlStockTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        onClearFilters={clearFilters}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <JvmlStockTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(row) => openDialog({ type: "view", row })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {/* isLoading (NOT loading) for the pagination component */}
      <JvmlStockTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── View sheet ───────────────────────────────────────────────── */}
      <ViewJvmlStockSheet
        open={dialog.type === "view"}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        row={dialog.type === "view" ? dialog.row : null}
      />

    </div>
  )
}
```

---

## 6. Hook-to-component wiring summary

| Hook output | Passed to component | Prop name |
|-------------|--------------------|-----------| 
| `rows` | `JvmlStockTable` | `rows` |
| `loading` | `JvmlStockTable` | `loading` (NOT isLoading) |
| `loading` | `JvmlStockTablePagination` | `isLoading` (NOT loading) |
| `error` | `JvmlStockTable` | `error` |
| `query.sortBy` | `JvmlStockTable` | `sortBy` |
| `query.sortOrder` | `JvmlStockTable` | `sortOrder` |
| `meta` | `JvmlStockTablePagination` | `meta` |
| `query` (full) | `JvmlStockTableToolbar` | `query` |
| `dialog.type === "view"` | `ViewJvmlStockSheet` | `open` |
| `dialog.row` (when view) | `ViewJvmlStockSheet` | `row` |

The `handleQueryChange` adapter in the page is the ONLY place that fans out a
`Partial<JvmlStockListQuery>` to the granular hook setters. The toolbar fires
`onQueryChange(patch)` — it never calls hook setters directly.

---

## 7. SPEC mismatches and builder warnings

### MISMATCH 1 — `setDateRange` is NOT in the reference (`useCustomerCodeManagement`)
The customer-codes reference has no date range. The SPEC adds `dateFrom`/`dateTo`
to query state and `setDateRange` to the result interface. The builder must add
`setDateRange` explicitly — it is NOT inherited from the reference pattern.
`clearFilters` must also clear `dateFrom`/`dateTo` (the reference only clears
per-field filters). Both are handled in the code blocks above.

### MISMATCH 2 — page export is `default export` not named export
SPEC §3 (`src/pages/jvml-stock/index.tsx`) says `default export JvmlStockListPage`.
The customer-codes reference (`CustomerCodeManagementPage`) is a **named** export.
The SPEC is authoritative. Use `export default function JvmlStockListPage()` so
`App.tsx` can lazy-import it: `const JvmlStockListPage = lazy(() => import("@/pages/jvml-stock"))`.

### MISMATCH 3 — `putData` not present in `client.ts`
`client.ts` exports: `getData`, `postData`, `patchData`, `deleteData`, `getList`, `buildQuery`.
`putData` is absent. SPEC §4 item 9 says ORCHESTRATOR adds it. The JVML Stock config
API (`src/api/settings/jvml-stock-config/update.ts`) calls `putData` — that file
is the Settings builder's concern, but the builder must NOT create `putData` in
`client.ts` — that is ORCHESTRATOR-only. The list page does not call `putData`.

### MISMATCH 4 — `JvmlStockTableToolbar` receives `onClearFilters` prop
The SPEC says the toolbar contains the filters popover and a `clearFilters` action.
The reference `CustomerCodeTableToolbar` uses only `onQueryChange`. For JVML Stock
the toolbar must also accept `onClearFilters: () => void` so the "Clear all" button
in the embedded `JvmlStockFilters` popover can reach the hook's `clearFilters` without
threading through `onQueryChange`. The page passes `onClearFilters={clearFilters}` as
shown in the code block above. The toolbar builder must add this prop.
(Alternative: toolbar calls `onQueryChange` with all filter keys set to `""` —
acceptable but the explicit `onClearFilters` is cleaner and matches SPEC intent.)

### MISMATCH 5 — No `actions` object on `UseJvmlStockListResult`
Customer-codes result has `actions: { refetch, remove }`. JVML Stock list is
read-only (no mutations on the list page). `refetch` is exposed directly on the
result, not nested under `actions`. The page does not use `actions.refetch()` —
it only calls `refetch()` directly (currently never needed since auto-fetch on mount).

### NOTE — `q` fields are snake_case
Filter keys in `JvmlStockListQuery` and `JvmlStockQueryState` are **snake_case**
(`so_sales_org`, `sales_order_type`, etc.) matching backend query keys exactly.
The backend's frozenset whitelist uses these exact names. Do NOT camelCase them.
`buildQuery` in `client.ts` passes keys as-is to `URLSearchParams`.
