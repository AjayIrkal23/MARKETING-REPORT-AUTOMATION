/**
 * CreditReportPage — thin orchestrator for the Credit Report screen.
 *
 * Layout: header → Separator → CreditReportTableToolbar (7 filters: 4 async-select
 * + blocked enum + credit_balance_sign enum + plant enum) → CreditReportTable →
 * CreditReportTablePagination → ViewCreditReportDialog.
 * All state lives in `useCreditReportList`. Zero business logic here.
 *
 * Route: /credit-report  (ProtectedRoute, NOT AdminRoute — all authenticated users)
 */

import { CreditCard } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useCreditReportList } from "@/components/credit-report/hooks/useCreditReportList"
import { CreditReportTableToolbar } from "@/components/credit-report/CreditReportTableToolbar"
import { CreditReportTable } from "@/components/credit-report/CreditReportTable"
import { CreditReportTablePagination } from "@/components/credit-report/CreditReportTablePagination"
import { ViewCreditReportDialog } from "@/components/credit-report/ViewCreditReportDialog"

import type { CreditReportSortBy } from "@/types/credit-report/credit-report"
import type { CreditReportQueryState } from "@/types/credit-report/credit-report-ui"

// ---------------------------------------------------------------------------
// Filter keys — the 7 filter fields this toolbar manages
// ---------------------------------------------------------------------------

const FILTER_KEYS = [
  "customer_name",
  "city",
  "customer",
  "cca_description",
  "blocked",
  "credit_balance_sign",
  "plant",
  "region",
] as const

type FilterKey = (typeof FILTER_KEYS)[number]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function CreditReportPage() {
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
  } = useCreditReportList()

  // ── Toolbar adapter ───────────────────────────────────────────────────────
  // CreditReportTableToolbar emits a single `onQueryChange` patch. Map it to
  // the granular hook setters.
  function handleQueryChange(patch: Partial<CreditReportQueryState>) {
    if (patch.page  !== undefined) setPage(patch.page)
    if (patch.limit !== undefined) setLimit(patch.limit)

    // Single report-date filter.
    if ("date" in patch) setDate(patch.date ?? null)

    // Per-field filters — delegate to setFilter (resets page to 1).
    const filterPatch: Record<string, string> = {}
    let hasFilter = false
    for (const key of FILTER_KEYS as ReadonlyArray<FilterKey>) {
      if (key in patch) {
        filterPatch[key] = (patch as Record<string, string>)[key] ?? ""
        hasFilter = true
      }
    }
    if (hasFilter) setFilter(filterPatch as Parameters<typeof setFilter>[0])
  }

  // ── Sort adapter ──────────────────────────────────────────────────────────
  function handleSortChange(col: CreditReportSortBy) {
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
          <CreditCard className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Credit Report
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            SAP credit management — JV0H / VJ0H control areas
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (8 filters + export) ─────────────────────────────── */}
      <CreditReportTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        loading={loading}
        exporting={exporting}
        onExport={() => exportRows()}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <CreditReportTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(row) => openDialog({ type: "view", row })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <CreditReportTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── View dialog (read-only) ───────────────────────────────────── */}
      <ViewCreditReportDialog
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        row={isView ? dialog.row : null}
      />

    </div>
  )
}
