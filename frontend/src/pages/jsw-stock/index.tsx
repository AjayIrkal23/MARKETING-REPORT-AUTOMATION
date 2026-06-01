/**
 * JswStockListPage — thin orchestrator for the JSW Stock List screen.
 *
 * Layout: header → Separator → JswStockTableToolbar (date + 4 per-field
 * filters) → JswStockTable → JswStockTablePagination → ViewJswStockDialog.
 * All state lives in `useJswStockList`. Zero business logic here.
 *
 * Route: /jsw-stock  (ProtectedRoute, NOT AdminRoute — all authenticated users)
 */

import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useJswStockList } from "@/components/jsw-stock/hooks/useJswStockList"
import { JswStockTableToolbar } from "@/components/jsw-stock/JswStockTableToolbar"
import { JswStockTable } from "@/components/jsw-stock/JswStockTable"
import { JswStockTablePagination } from "@/components/jsw-stock/JswStockTablePagination"
import { ViewJswStockDialog } from "@/components/jsw-stock/ViewJswStockDialog"

import type { JswStockField, JswStockSortBy } from "@/types/jsw-stock/stock"
import type { JswStockQueryState } from "@/types/jsw-stock/stock-ui"

// ---------------------------------------------------------------------------
// Filter key list — used by handleQueryChange to detect filter patches
// ---------------------------------------------------------------------------

const FILTER_KEYS: ReadonlyArray<JswStockField> = [
  "party_code",
  "sales_order_type",
  "customer_name",
  "sales_office",
  "nco_declared",
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function JswStockListPage() {
  const {
    query,
    setPage,
    setLimit,
    setSort,
    setFilter,
    setDate,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
  } = useJswStockList()

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // JswStockTableToolbar emits a single `onQueryChange` patch. Map it to the
  // granular hook setters.
  function handleQueryChange(patch: Partial<JswStockQueryState>) {
    if (patch.page  !== undefined) setPage(patch.page)
    if (patch.limit !== undefined) setLimit(patch.limit)

    // Single report-date filter.
    if ("date" in patch) setDate(patch.date ?? null)

    // Per-field filters — delegate to single setFilter (resets page to 1).
    const filterPatch: Record<string, string> = {}
    let hasFilter = false
    for (const key of FILTER_KEYS) {
      if (key in patch) {
        filterPatch[key] = (patch as Record<string, string>)[key] ?? ""
        hasFilter = true
      }
    }
    if (hasFilter) setFilter(filterPatch as Parameters<typeof setFilter>[0])
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  function handleSortChange(col: JswStockSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const isView = dialog.type === "view"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Boxes className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            JSW Stock List
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily SAP current-stock, customer-mapped
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (date + 4 per-field filters) ─────────────────────── */}
      <JswStockTableToolbar query={query} onQueryChange={handleQueryChange} />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <JswStockTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(row) => openDialog({ type: "view", row })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <JswStockTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── View dialog (read-only) ───────────────────────────────────── */}
      <ViewJswStockDialog
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        row={isView ? dialog.row : null}
      />

    </div>
  )
}
