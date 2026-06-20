/**
 * Admin user component prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns dialog/sheet/toolbar/table/pagination prop shapes so `.tsx` files
 * stay free of inline interface ownership.
 * Contract source: USER-MANAGEMENT-PLAN.md §4.2 + §4.7.
 */

import type { AdminUser, AdminUserListQuery, ResetPasswordInput, UpdateUserInput } from "./user"
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
// Create user dialog
// ---------------------------------------------------------------------------

export interface CreateUserDialogProps extends DialogBaseProps {
  /** Called after a successful creation so the table can refetch. */
  onSubmitted: () => void
}

// ---------------------------------------------------------------------------
// Edit user dialog
// ---------------------------------------------------------------------------

export interface EditUserDialogProps extends DialogBaseProps {
  /** The user being edited; dialog is a no-op if null. */
  user: AdminUser | null
  /** Called with the updated user after a successful edit. */
  onSubmitted: (updated: AdminUser) => void
}

// ---------------------------------------------------------------------------
// View user sheet (read-only detail panel)
// ---------------------------------------------------------------------------

export interface ViewUserSheetProps extends DialogBaseProps {
  /** The user to display; sheet renders nothing meaningful if null. */
  user: AdminUser | null
}

// ---------------------------------------------------------------------------
// Change-password dialog
// ---------------------------------------------------------------------------

export interface ChangePasswordDialogProps extends DialogBaseProps {
  /** The user whose password is being changed; dialog is a no-op if null. */
  user: AdminUser | null
  /** Called after a successful reset so the table can refetch. */
  onSubmitted: () => void
}

/** Internal form state for the two reset modes. */
export type PasswordResetMode = "set" | "reinvite"

/** Resolved form values passed to the API; `newPassword` absent = re-invite. */
export type ResetPasswordFormValues = ResetPasswordInput

// ---------------------------------------------------------------------------
// Confirm action dialog (delete / enable / disable)
// ---------------------------------------------------------------------------

export type ConfirmActionVariant = "delete" | "enable" | "disable" | "activate" | "deactivate"

export interface ConfirmActionDialogProps extends DialogBaseProps {
  variant: ConfirmActionVariant
  /** Display name or email shown in the confirmation message. */
  targetLabel: string
  /** Called when the user confirms the action. */
  onConfirm: () => void
  /** Shows a spinner and disables buttons while the action is in-flight. */
  isLoading?: boolean
  /** Optional override for the dialog title (defaults to the variant title). */
  title?: string
}

// ---------------------------------------------------------------------------
// Row actions menu
// ---------------------------------------------------------------------------

export interface RowActionsMenuProps {
  user: AdminUser
  /** The email of the currently authenticated admin (to disable self-actions). */
  currentUserEmail: string
  onView: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onChangePassword: (user: AdminUser) => void
  onEnable: (user: AdminUser) => void
  onDisable: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

// ---------------------------------------------------------------------------
// User status badge
// ---------------------------------------------------------------------------

export interface UserStatusBadgeProps {
  status: AdminUser["status"]
  /** Render as a smaller/compact variant. Default: false. */
  compact?: boolean
}

// ---------------------------------------------------------------------------
// User table
// ---------------------------------------------------------------------------

export interface UserTableProps {
  rows: AdminUser[]
  isLoading: boolean
  error: string | null
  /** Current sort field — used to render sort indicators. */
  sortBy: AdminUserListQuery["sortBy"]
  sortOrder: AdminUserListQuery["sortOrder"]
  /** Email of the current admin user (passed to RowActionsMenu). */
  currentUserEmail: string
  onSortChange: (sortBy: NonNullable<AdminUserListQuery["sortBy"]>) => void
  onView: (user: AdminUser) => void
  onEdit: (user: AdminUser) => void
  onChangePassword: (user: AdminUser) => void
  onEnable: (user: AdminUser) => void
  onDisable: (user: AdminUser) => void
  onDelete: (user: AdminUser) => void
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

export interface UserTableToolbarProps {
  query: AdminUserListQuery
  onQueryChange: (patch: Partial<AdminUserListQuery>) => void
  onCreateClick: () => void
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface UserTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// ---------------------------------------------------------------------------
// useUserManagement hook return contract
// ---------------------------------------------------------------------------

export interface UserManagementState {
  // Query state
  query: AdminUserListQuery
  setQuery: (patch: Partial<AdminUserListQuery>) => void
  // Fetch state
  rows: AdminUser[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  // Dialog state — which user / which dialog is open
  selectedUser: AdminUser | null
  viewOpen: boolean
  editOpen: boolean
  createOpen: boolean
  changePasswordOpen: boolean
  confirmAction: { variant: ConfirmActionVariant; user: AdminUser } | null
  // Dialog openers
  openView: (user: AdminUser) => void
  openEdit: (user: AdminUser) => void
  openCreate: () => void
  openChangePassword: (user: AdminUser) => void
  openConfirm: (variant: ConfirmActionVariant, user: AdminUser) => void
  // Dialog closers
  closeAll: () => void
  // Mutations (return void; toasts and refetch are handled internally)
  handleCreate: () => void
  handleUpdate: (input: UpdateUserInput) => Promise<void>
  handleDelete: () => Promise<void>
  handleEnable: () => Promise<void>
  handleDisable: () => Promise<void>
  handleResetPassword: (input: ResetPasswordInput) => Promise<void>
}
