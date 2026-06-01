/**
 * Credit Report UI prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns query state, dialog discriminated union, and every component prop
 * interface so `.tsx` files stay free of inline interface ownership.
 *
 * Filter surface: a single `date` (report_date exact match, "dd-MM-yyyy" | null)
 * + 6 filters — 4 async-select (customer_name, city, customer, cca_description)
 * + 2 enum selects (blocked, credit_balance_sign). NO free-text q, NO date-range.
 *
 * Convention (matches JvmlStock / CustomerCode pattern):
 *   - Table prop:      `loading: boolean`   (NOT isLoading)
 *   - Pagination prop: `isLoading: boolean` (NOT loading)
 */

import type { CreditReport, CreditReportSortBy } from "./credit-report"
import type { PaginationMeta } from "@/types/api/envelope"

// ---------------------------------------------------------------------------
// Query state
// ---------------------------------------------------------------------------

/**
 * Full reactive query state owned by useCreditReportList.
 * The 4 per-field async-select filters use empty string to mean "no filter"
 * (stripped before the API call). The 2 enum filters use "" for "no filter".
 */
export type CreditReportQueryState = {
  page: number
  limit: number
  sortBy: CreditReportSortBy
  sortOrder: "asc" | "desc"
  // single report-date filter — "dd-MM-yyyy" string, null = not set
  date: string | null
  // 4 async-select filters — empty string = no filter
  customer_name: string
  city: string
  customer: string
  cca_description: string
  // 2 enum filters — "" = no filter
  blocked: "" | "blocked" | "unblocked"
  credit_balance_sign: "" | "positive" | "negative"
}

// ---------------------------------------------------------------------------
// Dialog discriminated union
// ---------------------------------------------------------------------------

/** View-only dialog union — no create/edit/delete (read-only list). */
export type CreditReportDialogState =
  | { type: "none" }
  | { type: "view"; row: CreditReport }

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export interface CreditReportTableProps {
  rows: CreditReport[]
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: CreditReportSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: CreditReportSortBy) => void
  onView: (row: CreditReport) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface CreditReportTableToolbarProps {
  /** Full reactive query state — the 6 filter fields feed CreditReportFilters. */
  query: CreditReportQueryState
  onQueryChange: (patch: Partial<CreditReportQueryState>) => void
}

// ---------------------------------------------------------------------------
// Filters (4 async-select + 2 enum selects)
// ---------------------------------------------------------------------------

export interface CreditReportFiltersProps {
  // 4 async-select filter props — empty string = no filter
  customer_name: string
  city: string
  customer: string
  cca_description: string
  // 2 enum filter props
  blocked: "" | "blocked" | "unblocked"
  credit_balance_sign: "" | "positive" | "negative"
  onFilterChange: (
    patch: Partial<
      Pick<
        CreditReportQueryState,
        | "customer_name"
        | "city"
        | "customer"
        | "cca_description"
        | "blocked"
        | "credit_balance_sign"
      >
    >
  ) => void
  onClearAll: () => void
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface CreditReportTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading'). */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// View detail dialog
// ---------------------------------------------------------------------------

export interface ViewCreditReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: CreditReport | null
}

// ---------------------------------------------------------------------------
// useCreditReportList hook return contract
// ---------------------------------------------------------------------------

export interface UseCreditReportListResult {
  query: CreditReportQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: CreditReportSortBy, sortOrder: "asc" | "desc") => void
  /** Single setter for all 6 filter fields — resets page to 1. */
  setFilter: (
    patch: Partial<
      Pick<
        CreditReportQueryState,
        | "customer_name"
        | "city"
        | "customer"
        | "cca_description"
        | "blocked"
        | "credit_balance_sign"
      >
    >
  ) => void
  /** Set the single report-date filter ("dd-MM-yyyy" | null); resets page to 1. */
  setDate: (date: string | null) => void
  /** Resets all 6 filter fields to "" AND the date to null; resets page to 1. */
  clearFilters: () => void
  rows: CreditReport[]
  meta: PaginationMeta | null
  /** Named 'loading' (NOT 'isLoading'). */
  loading: boolean
  error: string | null
  dialog: CreditReportDialogState
  openDialog: (d: CreditReportDialogState) => void
  closeDialog: () => void
  refetch: () => void
}
