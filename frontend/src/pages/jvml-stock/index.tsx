/**
 * JvmlStockListPage — thin orchestrator for the JVML Stock List screen.
 *
 * Layout: header → Separator → JvmlStockTableToolbar (date + 4 per-field
 * filters) → JvmlStockTable → JvmlStockTablePagination → ViewJvmlStockDialog.
 * All state lives in `useJvmlStockList`. Zero business logic here.
 *
 * Route: /jvml-stock  (ProtectedRoute, NOT AdminRoute — all authenticated users)
 */

import { Boxes } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useJvmlStockList } from "@/components/jvml-stock/hooks/useJvmlStockList"
import { JvmlStockTableToolbar } from "@/components/jvml-stock/JvmlStockTableToolbar"
import { JvmlStockTable } from "@/components/jvml-stock/JvmlStockTable"
import { JvmlStockTablePagination } from "@/components/jvml-stock/JvmlStockTablePagination"
import { ViewJvmlStockDialog } from "@/components/jvml-stock/ViewJvmlStockDialog"

import type { JvmlStockField, JvmlStockSortBy } from "@/types/jvml-stock/stock"
import type { JvmlStockQueryState } from "@/types/jvml-stock/stock-ui"

// ---------------------------------------------------------------------------
// Filter key list — used by handleQueryChange to detect filter patches
// ---------------------------------------------------------------------------

const FILTER_KEYS: ReadonlyArray<JvmlStockField | "region"> = [
  "party_code",
  "sales_order_type",
  "customer_name",
  "sales_office",
  "nco_declared",
  "region",
]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function JvmlStockListPage() {
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
    exporting,
    exportRows,
    error,
    dialog,
    openDialog,
    closeDialog,
  } = useJvmlStockList()

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // JvmlStockTableToolbar emits a single `onQueryChange` patch. Map it to the
  // granular hook setters.
  function handleQueryChange(patch: Partial<JvmlStockQueryState>) {
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
  function handleSortChange(col: JvmlStockSortBy) {
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
            JVML Stock List
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily SAP current-stock, customer-mapped
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (date + 4 per-field filters) ─────────────────────── */}
      <JvmlStockTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        loading={loading}
        exporting={exporting}
        onExport={() => void exportRows()}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <JvmlStockTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(row) => openDialog({ type: "view", row })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <JvmlStockTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── View dialog (read-only) ───────────────────────────────────── */}
      <ViewJvmlStockDialog
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        row={isView ? dialog.row : null}
      />

    </div>
  )
}
