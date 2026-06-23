/**
 * RegionManagementPage — thin orchestrator for the admin Region Management screen.
 *
 * Layout:
 *   Page header (icon chip + title + subtitle)
 *   └─ RegionTableToolbar  (search + status filter + "Create region" button)
 *   └─ RegionTable         (server-driven sortable table)
 *   └─ RegionTablePagination
 *   └─ Dialogs / Sheet     (create · edit · view · confirm actions)
 *
 * All state (query params, fetched data, dialog open/close, mutations) lives in
 * `useRegionManagement`. This component contains zero business logic.
 *
 * Contract: .planning/regions/SPEC.md §2.5 + ADDENDUM §src/pages/admin/regions/index.tsx
 * Route:    /admin/regions  (guarded by AdminRoute)
 */

import { useState } from "react"
import { MapPin } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useRegionManagement } from "@/components/admin/regions/hooks/useRegionManagement"
import { RegionTableToolbar } from "@/components/admin/regions/RegionTableToolbar"
import { RegionTable } from "@/components/admin/regions/RegionTable"
import { RegionTablePagination } from "@/components/admin/regions/RegionTablePagination"
import { CreateRegionDialog } from "@/components/admin/regions/CreateRegionDialog"
import { EditRegionDialog } from "@/components/admin/regions/EditRegionDialog"
import { ViewRegionSheet } from "@/components/admin/regions/ViewRegionSheet"
import { ConfirmActionDialog } from "@/components/admin/users/ConfirmActionDialog"

import type { RegionListQuery, RegionSortBy } from "@/types/admin/region"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function RegionManagementPage() {
  const {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setActive,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
    actions,
  } = useRegionManagement()

  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // RegionTableToolbar expects a single `onQueryChange` callback that accepts
  // a partial RegionListQuery. Map it to the granular hook setters.
  function handleQueryChange(patch: Partial<RegionListQuery>) {
    if (patch.q      !== undefined) setSearch(patch.q ?? "")
    if (patch.active !== undefined) setActive(patch.active ?? "all")
    if (patch.page   !== undefined) setPage(patch.page)
    if (patch.limit  !== undefined) setLimit(patch.limit)
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  // RegionTable calls onSort(col: RegionSortBy). Toggle order when the
  // same column is clicked; default to "asc" for a new column.
  function handleSortChange(col: RegionSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const isCreate        = dialog.type === "create"
  const isView          = dialog.type === "view"
  const isEdit          = dialog.type === "edit"
  const isConfirmDelete = dialog.type === "confirm-delete"
  const isConfirmToggle = dialog.type === "confirm-toggle"

  const dialogRegion =
    dialog.type === "view"           ||
    dialog.type === "edit"           ||
    dialog.type === "confirm-delete" ||
    dialog.type === "confirm-toggle"
      ? dialog.region : null

  const confirmVariant =
    isConfirmDelete ? "delete" : dialogRegion?.active ? "deactivate" : "activate"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <MapPin className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Region Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage regional distribution groups and their notification recipients.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (search + filters + create button) ────────────────── */}
      <RegionTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        onCreate={() => openDialog({ type: "create" })}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <RegionTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(r)         => openDialog({ type: "view",           region: r })}
        onEdit={(r)         => openDialog({ type: "edit",           region: r })}
        onDelete={(r)       => openDialog({ type: "confirm-delete", region: r })}
        onToggleActive={(r) => openDialog({ type: "confirm-toggle", region: r })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <RegionTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── Dialogs / Sheet ──────────────────────────────────────────── */}

      {/* Create region */}
      <CreateRegionDialog
        open={isCreate}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSubmitted={actions.refetch}
      />

      {/* View region (read-only sheet) */}
      <ViewRegionSheet
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        region={isView ? dialog.region : null}
      />

      {/* Edit region */}
      <EditRegionDialog
        open={isEdit}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        region={isEdit ? dialog.region : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />

      {/* Confirm: activate / deactivate / delete */}
      <ConfirmActionDialog
        open={isConfirmDelete || isConfirmToggle}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        variant={confirmVariant}
        targetLabel={dialogRegion?.name ?? ""}
        isLoading={isConfirmLoading}
        onConfirm={async () => {
          if (!dialogRegion) return
          setIsConfirmLoading(true)
          try {
            if (isConfirmDelete) await actions.remove(dialogRegion.id)
            if (isConfirmToggle) await actions.toggleActive(dialogRegion)
          } finally {
            setIsConfirmLoading(false)
          }
        }}
      />

    </div>
  )
}
