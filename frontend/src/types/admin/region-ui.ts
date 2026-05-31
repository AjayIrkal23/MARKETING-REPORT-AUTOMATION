/**
 * Admin region component prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns dialog/sheet/toolbar/table/pagination prop shapes so `.tsx` files
 * stay free of inline interface ownership.
 * Contract source: .planning/regions/SPEC.md §2.2 + ADDENDUM §types/admin/region-ui.ts.
 */

import type { Region, RegionListQuery, RegionSortBy } from "./region"
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
// Create region dialog
// ---------------------------------------------------------------------------

export interface CreateRegionDialogProps extends DialogBaseProps {
  /** Called after a successful creation so the table can refetch. */
  onSubmitted: () => void
}

// ---------------------------------------------------------------------------
// Edit region dialog
// ---------------------------------------------------------------------------

export interface EditRegionDialogProps extends DialogBaseProps {
  /** The region being edited; dialog is a no-op if null. */
  region: Region | null
  /** Always triggers refetch — no optimistic Region payload returned. */
  onSubmitted: () => void
}

// ---------------------------------------------------------------------------
// View region sheet (read-only detail panel)
// ---------------------------------------------------------------------------

export interface ViewRegionSheetProps extends DialogBaseProps {
  /** The region to display; sheet renders nothing meaningful if null. */
  region: Region | null
}

// ---------------------------------------------------------------------------
// Confirm region action dialog (delete / activate / deactivate)
// ---------------------------------------------------------------------------

export interface ConfirmRegionActionProps extends DialogBaseProps {
  variant: "delete" | "activate" | "deactivate"
  /** Region name shown in the confirmation copy. */
  targetLabel: string
  /** Called when the user confirms the action. */
  onConfirm: () => void
  /** Shows a spinner and disables buttons while the action is in-flight. */
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Active status badge
// ---------------------------------------------------------------------------

export interface RegionActiveBadgeProps {
  active: boolean
  /** Render as a smaller/compact variant. Default: false. */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Row actions menu
// ---------------------------------------------------------------------------

export interface RowActionsMenuProps {
  region: Region
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

// ---------------------------------------------------------------------------
// Region table
// ---------------------------------------------------------------------------

export interface RegionTableProps {
  rows: Region[]
  /** Named 'loading' (NOT 'isLoading') — SPEC §2.2 + ADDENDUM blocker #4. */
  loading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: RegionSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: RegionSortBy) => void
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface RegionTableToolbarProps {
  query: RegionListQuery
  onQueryChange: (patch: Partial<RegionListQuery>) => void
  onCreate: () => void
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface RegionTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// Query state (defined before UseRegionManagementResult which references it)
// ---------------------------------------------------------------------------

export type RegionQueryState = {
  page: number
  limit: number
  sortBy: RegionSortBy
  sortOrder: "asc" | "desc"
  q: string
  active: boolean | "all"
}

// ---------------------------------------------------------------------------
// Dialog discriminated union
// ---------------------------------------------------------------------------

export type RegionDialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view";           region: Region }
  | { type: "edit";           region: Region }
  | { type: "confirm-delete"; region: Region }
  | { type: "confirm-toggle"; region: Region }   // resolves to activate or deactivate at render time

// ---------------------------------------------------------------------------
// useRegionManagement hook return contract
// ---------------------------------------------------------------------------

export interface UseRegionManagementResult {
  query: RegionQueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: RegionSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setActive: (active: boolean | "all") => void
  rows: Region[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  dialog: RegionDialogState
  openDialog: (d: RegionDialogState) => void
  closeDialog: () => void
  actions: {
    refetch: () => void
    remove: (id: string) => Promise<void>
    toggleActive: (region: Region) => Promise<void>
  }
}
