/**
 * JSW Stock UI prop contracts (`<feature>-ui.ts` convention).
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

import type { JswStock, JswStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

/**
 * Full reactive query state owned by useJswStockList.
 * The 5 per-field filters use empty string to mean "no filter" (stripped
 * before the API call). `date` is "dd-MM-yyyy" | null (null = no date filter).
 */
export type JswStockQueryState = {
  page: number
  limit: number
  sortBy: JswStockSortBy
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
export type JswStockDialogState =
  | { type: "none" }
  | { type: "view"; row: JswStock }

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export interface JswStockTableProps {
  rows: JswStock[]
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: JswStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JswStockSortBy) => void
  onView: (row: JswStock) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface JswStockTableToolbarProps {
  /** Full reactive query state — date feeds DatePicker, the 4 string fields feed JswStockFilters. */
  query: JswStockQueryState
  onQueryChange: (patch: Partial<JswStockQueryState>) => void
}

// ---------------------------------------------------------------------------
// Filters (5 async-select fields)
// ---------------------------------------------------------------------------

/** Subset of JswStockQueryState keys that map to the 5 filterable fields. */
type FilterPatch = Partial<
  Pick<
    JswStockQueryState,
    "party_code" | "sales_order_type" | "customer_name" | "sales_office" | "nco_declared"
  >
>

export interface JswStockFiltersProps {
  // one prop per JswStockField value — empty string = no filter
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

export interface JswStockTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading'). */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// View detail dialog
// ---------------------------------------------------------------------------

export interface ViewJswStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: JswStock | null
}

// ---------------------------------------------------------------------------
// useJswStockList hook return contract
// ---------------------------------------------------------------------------

export interface UseJswStockListResult {
  query: JswStockQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: JswStockSortBy, sortOrder: "asc" | "desc") => void
  /** Single setter for the 4 per-field filters — resets page to 1. */
  setFilter: (patch: FilterPatch) => void
  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  setDate: (date: string | null) => void
  /** Resets the 4 per-field filters AND the date; resets page to 1. */
  clearFilters: () => void
  rows: JswStock[]
  meta: PaginationMeta | null
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  dialog: JswStockDialogState
  openDialog: (d: JswStockDialogState) => void
  closeDialog: () => void
  refetch: () => void
}
