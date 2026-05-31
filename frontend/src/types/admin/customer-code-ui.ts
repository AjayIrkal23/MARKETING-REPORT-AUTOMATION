/**
 * Admin customer-code component prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns dialog/sheet/toolbar/table/pagination/filters prop shapes so `.tsx`
 * files stay free of inline interface ownership.
 * Contract source: .planning/customer-codes/SPEC.md §4.1 + ADDENDUM §types/admin/customer-code-ui.ts.
 */

import type {
  CustomerCode,
  CustomerCodeListQuery,
  CustomerCodeSortBy,
} from "./customer-code"
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
// Create customer code dialog
// ---------------------------------------------------------------------------

export interface CreateCustomerCodeDialogProps extends DialogBaseProps {
  /** Called after a successful creation so the table can refetch. */
  onSubmitted: () => void
}

// ---------------------------------------------------------------------------
// Edit customer code dialog
// ---------------------------------------------------------------------------

export interface EditCustomerCodeDialogProps extends DialogBaseProps {
  /** The customer code being edited; dialog is a no-op if null. */
  customerCode: CustomerCode | null
  /** Always triggers refetch — no optimistic CustomerCode payload returned. */
  onSubmitted: () => void
}

// ---------------------------------------------------------------------------
// View customer code sheet (read-only detail panel)
// ---------------------------------------------------------------------------

export interface ViewCustomerCodeSheetProps extends DialogBaseProps {
  /** The customer code to display; sheet renders nothing meaningful if null. */
  customerCode: CustomerCode | null
}

// ---------------------------------------------------------------------------
// Confirm customer code action dialog (delete only — no active flag)
// ---------------------------------------------------------------------------

export interface ConfirmCustomerCodeActionProps extends DialogBaseProps {
  variant: "delete"
  /** Customer code label shown in the confirmation copy (e.g. code + customer name). */
  targetLabel: string
  /** Called when the user confirms the action. */
  onConfirm: () => void
  /** Shows a spinner and disables buttons while the action is in-flight. */
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Segment badge
// ---------------------------------------------------------------------------

export interface SegmentBadgeProps {
  /** Raw segment value as stored — case may vary (e.g. "oem", "OEM", "Retail"). */
  segment: string
  /** Render as a smaller/compact variant. Default: false. */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Row actions menu
// ---------------------------------------------------------------------------

export interface RowActionsMenuProps {
  customerCode: CustomerCode
  onView: (customerCode: CustomerCode) => void
  onEdit: (customerCode: CustomerCode) => void
  onDelete: (customerCode: CustomerCode) => void
}

// ---------------------------------------------------------------------------
// Customer code table
// ---------------------------------------------------------------------------

export interface CustomerCodeTableProps {
  rows: CustomerCode[]
  /** Named 'loading' (NOT 'isLoading') — SPEC §4.1 + ADDENDUM Area 8 BLOCKER 4. */
  loading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: CustomerCodeSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: CustomerCodeSortBy) => void
  onView: (customerCode: CustomerCode) => void
  onEdit: (customerCode: CustomerCode) => void
  onDelete: (customerCode: CustomerCode) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface CustomerCodeTableToolbarProps {
  query: CustomerCodeListQuery
  onQueryChange: (patch: Partial<CustomerCodeListQuery>) => void
}

// ---------------------------------------------------------------------------
// Filters panel (per-field async comboboxes)
// ---------------------------------------------------------------------------

/** Per-field filter values + callbacks for the Filters popover/sheet. */
export interface CustomerCodeFiltersProps {
  segment: string
  code: string
  customer: string
  destination: string
  cam: string
  mob: string
  onFilterChange: (patch: Partial<Pick<CustomerCodeQueryState,
    "segment" | "code" | "customer" | "destination" | "cam" | "mob">>) => void
  onClearAll: () => void
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface CustomerCodeTablePaginationProps {
  meta: PaginationMeta | null
  /** Named 'isLoading' (NOT 'loading') — SPEC §4.1 + ADDENDUM Area 8 BLOCKER 4. */
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// Import dialog
// ---------------------------------------------------------------------------

export interface ImportCustomerCodesDialogProps extends DialogBaseProps {
  /** Called after a successful import so the table can refetch. Wire to `actions.refetch()`. */
  onImported: () => void
}

// ---------------------------------------------------------------------------
// Query state (defined before UseCustomerCodeManagementResult which references it)
// ---------------------------------------------------------------------------

export type CustomerCodeQueryState = {
  page: number
  limit: number
  sortBy: CustomerCodeSortBy
  sortOrder: "asc" | "desc"
  q: string
  // Per-field filters — empty string means "no filter" (stripped before API call)
  segment: string
  code: string
  customer: string
  destination: string
  cam: string
  mob: string
  /** region_id exact match — query key is "region" (NOT "region_id"). ADDENDUM Area 8 BLOCKER 3. */
  region: string
}

// ---------------------------------------------------------------------------
// Dialog discriminated union
// ---------------------------------------------------------------------------

export type CustomerCodeDialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view"; customerCode: CustomerCode }
  | { type: "edit"; customerCode: CustomerCode }
  | { type: "confirm-delete"; customerCode: CustomerCode }
  | { type: "import" }

// ---------------------------------------------------------------------------
// useCustomerCodeManagement hook return contract
// ---------------------------------------------------------------------------

export interface UseCustomerCodeManagementResult {
  query: CustomerCodeQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: CustomerCodeSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  /**
   * Single setter for all per-field filters — resets page to 1 on every call.
   * ADDENDUM Area 9 BLOCKER-4: one `setFilter` replaces 11 individual setters.
   */
  setFilter: (
    patch: Partial<
      Pick<
        CustomerCodeQueryState,
        | "segment"
        | "code"
        | "customer"
        | "destination"
        | "cam"
        | "mob"
        | "region"
      >
    >,
  ) => void
  /** Resets all per-field filters and region to empty strings; resets page to 1. */
  clearFilters: () => void
  rows: CustomerCode[]
  meta: PaginationMeta | null
  /** Named 'loading' (NOT 'isLoading') — mirrors RegionManagement. */
  loading: boolean
  error: string | null
  dialog: CustomerCodeDialogState
  openDialog: (d: CustomerCodeDialogState) => void
  closeDialog: () => void
  actions: {
    refetch: () => void
    remove: (id: string) => Promise<void>
    // No toggleActive — customer codes have no active flag (SPEC §4.1)
  }
}
