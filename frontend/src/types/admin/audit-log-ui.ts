/**
 * Admin audit-log component prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns sheet/toolbar/table/pagination/badge prop shapes so `.tsx` files
 * stay free of inline interface ownership.
 * Contract source: SPEC.md §B2.
 */

import type {
  AuditCategory,
  AuditLogDetail,
  AuditLogFacets,
  AuditLogListQuery,
  AuditLogSortBy,
  AuditOutcome,
} from "./audit-log"
import type { PaginationMeta } from "@/types/api/envelope"

// ---------------------------------------------------------------------------
// Shared dialog primitives
// ---------------------------------------------------------------------------

/** Common props for all controlled dialogs/sheets (Radix open pattern). */
export interface DialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Category badge
// ---------------------------------------------------------------------------

export interface AuditCategoryBadgeProps {
  category: AuditCategory
  /** Render as a smaller/compact variant. Default: false. */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Outcome badge
// ---------------------------------------------------------------------------

export interface AuditOutcomeBadgeProps {
  outcome: AuditOutcome
  /** Render as a smaller/compact variant. Default: false. */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Audit log table
// ---------------------------------------------------------------------------

export interface AuditLogTableProps {
  rows: import("./audit-log").AuditLog[]
  isLoading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: AuditLogSortBy
  sortOrder: "asc" | "desc"
  onSort: (col: AuditLogSortBy) => void
  onView: (id: string) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface AuditLogToolbarProps {
  /** Current query state (read-only — toolbar dispatches patches only). */
  query: AuditLogListQuery
  onQueryChange: (patch: Partial<AuditLogListQuery>) => void
  /** Facet enums from the backend; null while loading or on error. */
  facets: AuditLogFacets | null
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface AuditLogPaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// View audit log sheet (read-only detail panel)
// ---------------------------------------------------------------------------

export interface ViewAuditLogSheetProps extends DialogBaseProps {
  /** The full detail record to display; sheet shows skeleton if null + isLoading. */
  detail: AuditLogDetail | null
  /** True while the detail fetch is in-flight. */
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// useAuditLogs hook return contract
// ---------------------------------------------------------------------------

export interface AuditLogsState {
  // Query state
  query: AuditLogListQuery
  onQueryChange: (patch: Partial<AuditLogListQuery>) => void
  // Fetch state
  rows: import("./audit-log").AuditLog[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  // Pagination helpers (reset page:1 internally)
  onSort: (col: AuditLogSortBy) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  // Facets (loaded once on mount; null on failure)
  facets: AuditLogFacets | null
  // View sheet state
  view: {
    open: boolean
    detail: AuditLogDetail | null
    loading: boolean
  }
  openView: (id: string) => void
  closeView: () => void
}
