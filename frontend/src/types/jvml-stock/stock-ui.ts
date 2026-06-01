/**
 * JVML Stock UI prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns query state, dialog discriminated union, and every component prop
 * interface so `.tsx` files stay free of inline interface ownership.
 *
 * Filter surface (2026-06): exactly 5 filters — a single `date` (string
 * "dd-MM-yyyy" | null) plus four per-field async-select filters
 * (sales_order_type, customer_name, sales_office, nco_declared).
 *
 * Convention (matches CustomerCode pattern):
 *   - Table prop:      `loading: boolean`   (NOT isLoading)
 *   - Pagination prop: `isLoading: boolean` (NOT loading)
 */

import type { JvmlStock, JvmlStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

/**
 * Full reactive query state owned by useJvmlStockList.
 * The 5 per-field filters use empty string to mean "no filter" (stripped
 * before the API call). `date` is "dd-MM-yyyy" | null (null = no date filter).
 */
export type JvmlStockQueryState = {
  page: number
  limit: number
  sortBy: JvmlStockSortBy
  sortOrder: "asc" | "desc"
  // single report-date filter — "dd-MM-yyyy" string, null = not set
  date: string | null
  // 5 per-field filters — empty string = no filter
  party_code: string
  sales_order_type: string
  customer_name: string
  sales_office: string
  nco_declared: string
}

// ---------------------------------------------------------------------------
// Dialog discriminated union
// ---------------------------------------------------------------------------

/** View-only dialog union — no create/edit/delete (read-only list). */
export type JvmlStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JvmlStock }

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export interface JvmlStockTableProps {
  rows: JvmlStock[]
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: JvmlStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
  onView: (row: JvmlStock) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface JvmlStockTableToolbarProps {
  /** Full reactive query state — date feeds DatePicker, the 4 string fields feed JvmlStockFilters. */
  query: JvmlStockQueryState
  onQueryChange: (patch: Partial<JvmlStockQueryState>) => void
}

// ---------------------------------------------------------------------------
// Filters (5 async-select fields)
// ---------------------------------------------------------------------------

/** Subset of JvmlStockQueryState keys that map to the 5 filterable fields. */
type FilterPatch = Partial<
  Pick<
    JvmlStockQueryState,
    "party_code" | "sales_order_type" | "customer_name" | "sales_office" | "nco_declared"
  >
>

export interface JvmlStockFiltersProps {
  // one prop per JvmlStockField value — empty string = no filter
  party_code: string
  sales_order_type: string
  customer_name: string
  sales_office: string
  nco_declared: string
  onFilterChange: (patch: FilterPatch) => void
  onClearAll: () => void
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface JvmlStockTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading'). */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// View detail dialog
// ---------------------------------------------------------------------------

export interface ViewJvmlStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JvmlStock | null
}

// ---------------------------------------------------------------------------
// useJvmlStockList hook return contract
// ---------------------------------------------------------------------------

export interface UseJvmlStockListResult {
  query: JvmlStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JvmlStockSortBy, sortOrder: "asc" | "desc") => void
  /** Single setter for the 4 per-field filters — resets page to 1. */
  setFilter: (patch: FilterPatch) => void
  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  setDate: (date: string | null) => void
  /** Resets the 4 per-field filters AND the date; resets page to 1. */
  clearFilters: () => void
  rows: JvmlStock[]
  meta: PaginationMeta | null
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  dialog: JvmlStockDialogState
  openDialog: (d: JvmlStockDialogState) => void
  closeDialog: () => void
  refetch: () => void
}
