/**
 * CustomerCodeManagementPage — thin orchestrator for the admin Customer Code Management screen.
 *
 * Layout:
 *   Page header (icon chip + title + subtitle)
 *   └─ CustomerCodeTableToolbar  (search + region filter + per-field filters + import + template + create)
 *   └─ CustomerCodeTable         (server-driven sortable table)
 *   └─ CustomerCodeTablePagination
 *   └─ Dialogs / Sheet           (create · edit · view · import · confirm delete)
 *
 * All state (query params, fetched data, dialog open/close, mutations) lives in
 * `useCustomerCodeManagement`. This component contains zero business logic.
 *
 * Contract: .planning/customer-codes/SPEC.md §4.4 + ADDENDUM §Area 9
 * Route:    /admin/customer-codes  (guarded by AdminRoute)
 */

import { useState } from "react"
import { Building2, DownloadIcon, FileSpreadsheet, PlusIcon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { useCustomerCodeManagement } from "@/components/admin/customer-codes/hooks/useCustomerCodeManagement"
import { CustomerCodeTableToolbar } from "@/components/admin/customer-codes/CustomerCodeTableToolbar"
import { CustomerCodeTable } from "@/components/admin/customer-codes/CustomerCodeTable"
import { CustomerCodeTablePagination } from "@/components/admin/customer-codes/CustomerCodeTablePagination"
import { CreateCustomerCodeDialog } from "@/components/admin/customer-codes/CreateCustomerCodeDialog"
import { EditCustomerCodeDialog } from "@/components/admin/customer-codes/EditCustomerCodeDialog"
import { ViewCustomerCodeSheet } from "@/components/admin/customer-codes/ViewCustomerCodeSheet"
import { ImportCustomerCodesDialog } from "@/components/admin/customer-codes/ImportCustomerCodesDialog"
import { ConfirmActionDialog } from "@/components/admin/users/ConfirmActionDialog"
import { downloadCustomerCodesTemplate } from "@/api/admin/customer-codes/template"
import { exportCustomerCodes } from "@/api/admin/customer-codes/export"

import type { CustomerCodeListQuery, CustomerCodeSortBy } from "@/types/admin/customer-code"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function CustomerCodeManagementPage() {
  const {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setFilter,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
    selectedIds,
    selectAll,
    clearSelection,
    toggleSelection,
    actions,
  } = useCustomerCodeManagement()

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const selectedCount = selectedIds.size

  function openBulkDelete() { setBulkDeleteOpen(true) }
  function closeBulkDelete() { setBulkDeleteOpen(false) }

  async function handleBulkDelete() {
    if (selectedCount === 0) return
    setIsBulkDeleting(true)
    try {
      await actions.bulkRemove(Array.from(selectedIds))
      closeBulkDelete()
      clearSelection()
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // CustomerCodeTableToolbar expects a single `onQueryChange` callback that
  // accepts a partial CustomerCodeListQuery. Map it to the granular hook setters.
  function handleQueryChange(patch: Partial<CustomerCodeListQuery>) {
    if ("q" in patch) setSearch(patch.q ?? "")
    if (patch.page  !== undefined) setPage(patch.page)
    if (patch.limit !== undefined) setLimit(patch.limit)

    // Per-field filters — delegate to single setFilter (resets page to 1).
    // ADDENDUM Area 9 BLOCKER-4: one setFilter replaces 11 individual setters.
    const filterKeys = [
      "segment", "code", "customer", "destination",
      "cam", "mob", "ship_to_city", "rake", "transport_mode", "region",
    ] as const
    const filterPatch: Partial<typeof query> = {}
    let hasFilter = false
    for (const key of filterKeys) {
      if (key in patch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (filterPatch as any)[key] = (patch as any)[key] ?? ""
        hasFilter = true
      }
    }
    if (hasFilter) setFilter(filterPatch)
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  // CustomerCodeTable calls onSort(col: CustomerCodeSortBy). Toggle order when
  // the same column is clicked; default to "asc" for a new column.
  function handleSortChange(col: CustomerCodeSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const isCreate        = dialog.type === "create"
  const isView          = dialog.type === "view"
  const isEdit          = dialog.type === "edit"
  const isConfirmDelete = dialog.type === "confirm-delete"
  const isImport        = dialog.type === "import"

  // Resolve the customer code from the discriminated union for dialogs that need it.
  const dialogCustomerCode =
    dialog.type === "view"           ||
    dialog.type === "edit"           ||
    dialog.type === "confirm-delete"
      ? dialog.customerCode : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Customer Code Management
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage SAP customer codes, segments, and regional assignments.
            </p>
          </div>
        </div>

        {/* Action buttons — moved from the toolbar into the header's empty space */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog({ type: "import" })}
            aria-label="Import customer codes from Excel"
            className="gap-1.5"
          >
            <UploadIcon className="size-3.5" aria-hidden />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void downloadCustomerCodesTemplate() }}
            aria-label="Download import template"
            className="gap-1.5"
          >
            <DownloadIcon className="size-3.5" aria-hidden />
            Download template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void exportCustomerCodes(query) }}
            aria-label="Export customer codes to Excel"
            className="gap-1.5"
          >
            <FileSpreadsheet className="size-3.5" aria-hidden />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => openDialog({ type: "create" })}
            aria-label="Create new customer code"
            className="gap-1.5"
          >
            <PlusIcon className="size-3.5" aria-hidden />
            New customer code
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (search + filters + import + template + create + bulk delete) ───── */}
      <CustomerCodeTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        selectedCount={selectedCount}
        hasSelection={selectedCount > 0}
        onDeleteSelected={openBulkDelete}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <CustomerCodeTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(cc)   => openDialog({ type: "view",           customerCode: cc })}
        onEdit={(cc)   => openDialog({ type: "edit",           customerCode: cc })}
        onDelete={(cc) => openDialog({ type: "confirm-delete", customerCode: cc })}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onSelectAll={(checked) => { if (checked) selectAll(); else clearSelection() }}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {/* ADDENDUM Area 8 BLOCKER 4: CustomerCodeTablePagination takes `isLoading` (NOT `loading`) */}
      <CustomerCodeTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── Dialogs / Sheet ──────────────────────────────────────────── */}

      {/* Create customer code */}
      <CreateCustomerCodeDialog
        open={isCreate}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSubmitted={actions.refetch}
      />

      {/* View customer code (read-only sheet) */}
      <ViewCustomerCodeSheet
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        customerCode={isView ? dialog.customerCode : null}
      />

      {/* Edit customer code */}
      <EditCustomerCodeDialog
        open={isEdit}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        customerCode={isEdit ? dialog.customerCode : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />

      {/* Import customer codes from Excel */}
      {/* ADDENDUM Area 9 BLOCKER-3: import mutation lives in ImportCustomerCodesDialog,
          NOT in useCustomerCodeMutations. onImported() wires to actions.refetch(). */}
      <ImportCustomerCodesDialog
        open={isImport}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onImported={() => { closeDialog(); actions.refetch() }}
      />

      {/* Confirm: single delete */}
      {/* ADDENDUM Area 9 BLOCKER-2: ConfirmActionDialog.delete variant is domain-neutral.
          targetLabel uses `code – customer` pattern for clear identification. */}
      <ConfirmActionDialog
        open={isConfirmDelete}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        variant="delete"
        targetLabel={
          dialogCustomerCode
            ? `${dialogCustomerCode.code} – ${dialogCustomerCode.customer}`
            : ""
        }
        onConfirm={() => {
          if (!dialogCustomerCode) return
          void actions.remove(dialogCustomerCode.id)
        }}
      />

      {/* Confirm: bulk delete */}
      <ConfirmActionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        variant="delete"
        title="Delete selected customer codes"
        targetLabel={
          selectedCount === 0
            ? ""
            : `${selectedCount} customer code${selectedCount > 1 ? "s" : ""}`
        }
        isLoading={isBulkDeleting}
        onConfirm={() => { void handleBulkDelete() }}
      />

    </div>
  )
}
