/**
 * UserManagementPage — thin orchestrator for the admin User Management screen.
 *
 * Layout:
 *   Page header (title + subtitle)
 *   └─ UserTableToolbar  (search + filters + "Create user" button)
 *   └─ UserTable         (server-driven sortable table)
 *   └─ UserTablePagination
 *   └─ Dialogs / Sheet   (create · edit · view · change-password · confirm actions)
 *
 * All state (query params, fetched data, dialog open/close, mutations) lives in
 * `useUserManagement`. This component contains zero business logic.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.7
 * Route:    /admin/users  (guarded by AdminRoute)
 */

import { useState } from "react"
import { ShieldUser } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useUserManagement } from "@/components/admin/users/hooks/useUserManagement"
import { UserTableToolbar } from "@/components/admin/users/UserTableToolbar"
import { UserTable } from "@/components/admin/users/UserTable"
import { UserTablePagination } from "@/components/admin/users/UserTablePagination"
import { CreateUserDialog } from "@/components/admin/users/CreateUserDialog"
import { EditUserDialog } from "@/components/admin/users/EditUserDialog"
import { ViewUserSheet } from "@/components/admin/users/ViewUserSheet"
import { ChangePasswordDialog } from "@/components/admin/users/ChangePasswordDialog"
import { ConfirmActionDialog } from "@/components/admin/users/ConfirmActionDialog"

import { useAppSelector } from "@/app/hooks"
import { selectSessionUser } from "@/store/auth/selectors"

import type { AdminUserListQuery, AdminUserSortBy } from "@/types/admin/user"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function UserManagementPage() {
  const sessionUser = useAppSelector(selectSessionUser)
  const currentUserEmail = sessionUser?.email ?? ""

  const {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setStatus,
    setRole,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
    actions,
  } = useUserManagement()

  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // UserTableToolbar expects a single `onQueryChange` callback that accepts
  // a partial AdminUserListQuery. Map it to the granular hook setters.
  function handleQueryChange(patch: Partial<AdminUserListQuery>) {
    if (patch.q !== undefined)      setSearch(patch.q ?? "")
    if (patch.status !== undefined) setStatus(patch.status ?? "all")
    if (patch.role !== undefined)   setRole(patch.role ?? "all")
    if (patch.page !== undefined)   setPage(patch.page)
    if (patch.limit !== undefined)  setLimit(patch.limit)
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  // UserTable calls onSortChange(col: AdminUserSortBy). Toggle order when the
  // same column is clicked; default to "asc" for a new column.
  function handleSortChange(col: AdminUserSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const isCreate         = dialog.type === "create"
  const isView           = dialog.type === "view"
  const isEdit           = dialog.type === "edit"
  const isChangePassword = dialog.type === "change-password"
  const isConfirmEnable  = dialog.type === "confirm-enable"
  const isConfirmDisable = dialog.type === "confirm-disable"
  const isConfirmDelete  = dialog.type === "confirm-delete"

  const dialogUser =
    dialog.type === "view"            ? dialog.user :
    dialog.type === "edit"            ? dialog.user :
    dialog.type === "change-password" ? dialog.user :
    dialog.type === "confirm-enable"  ? dialog.user :
    dialog.type === "confirm-disable" ? dialog.user :
    dialog.type === "confirm-delete"  ? dialog.user :
    null

  const confirmVariant =
    isConfirmEnable  ? "enable"  :
    isConfirmDisable ? "disable" :
    "delete"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <ShieldUser className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            User Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage accounts for JSW Marketing Reports.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (search + filters + create button) ────────────────── */}
      <UserTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        onCreateClick={() => openDialog({ type: "create" })}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <UserTable
        rows={rows}
        isLoading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        currentUserEmail={currentUserEmail}
        onSortChange={handleSortChange}
        onView={(u)            => openDialog({ type: "view",            user: u })}
        onEdit={(u)            => openDialog({ type: "edit",            user: u })}
        onChangePassword={(u)  => openDialog({ type: "change-password", user: u })}
        onEnable={(u)          => openDialog({ type: "confirm-enable",  user: u })}
        onDisable={(u)         => openDialog({ type: "confirm-disable", user: u })}
        onDelete={(u)          => openDialog({ type: "confirm-delete",  user: u })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <UserTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── Dialogs / Sheet ──────────────────────────────────────────── */}

      {/* Create user */}
      <CreateUserDialog
        open={isCreate}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSubmitted={actions.refetch}
      />

      {/* View user (read-only sheet) */}
      <ViewUserSheet
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        user={isView ? dialog.user : null}
      />

      {/* Edit user */}
      <EditUserDialog
        open={isEdit}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        user={isEdit ? dialog.user : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />

      {/* Change / reset password */}
      <ChangePasswordDialog
        open={isChangePassword}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        user={isChangePassword ? dialog.user : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />

      {/* Confirm: enable / disable / delete */}
      <ConfirmActionDialog
        open={isConfirmEnable || isConfirmDisable || isConfirmDelete}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        variant={confirmVariant}
        targetLabel={dialogUser?.name ?? dialogUser?.emailid ?? "this user"}
        isLoading={isConfirmLoading}
        onConfirm={async () => {
          if (!dialogUser) return
          setIsConfirmLoading(true)
          try {
            if (isConfirmEnable)  await actions.enable(dialogUser.id)
            if (isConfirmDisable) await actions.disable(dialogUser.id)
            if (isConfirmDelete)  await actions.remove(dialogUser.id)
          } finally {
            setIsConfirmLoading(false)
          }
        }}
      />

    </div>
  )
}
