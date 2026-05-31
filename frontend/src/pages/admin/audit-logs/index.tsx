/**
 * AuditLogsPage — thin orchestrator for the admin Audit Logs screen.
 *
 * Layout:
 *   Page header (title + subtitle)
 *   └─ AuditLogToolbar    (search + category/outcome/method filters)
 *   └─ AuditLogTable      (server-driven sortable table)
 *   └─ AuditLogPagination
 *   └─ ViewAuditLogSheet  (read-only detail panel)
 *
 * All state (query params, fetched data, view-sheet open/close) lives in
 * `useAuditLogs`. This component contains zero business logic.
 *
 * Contract: SPEC.md §B10
 * Route:    /admin/audit-logs  (guarded by AdminRoute)
 */

import { ScrollText } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useAuditLogs } from "@/components/admin/audit-logs/hooks/useAuditLogs"
import { AuditLogToolbar } from "@/components/admin/audit-logs/AuditLogToolbar"
import { AuditLogTable } from "@/components/admin/audit-logs/AuditLogTable"
import { AuditLogPagination } from "@/components/admin/audit-logs/AuditLogPagination"
import { ViewAuditLogSheet } from "@/components/admin/audit-logs/ViewAuditLogSheet"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function AuditLogsPage() {
  const s = useAuditLogs()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <ScrollText className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide activity across APIs, auth, cron jobs, and server lifecycle.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar (search + filters) ────────────────────────────────── */}
      <AuditLogToolbar
        query={s.query}
        facets={s.facets}
        onQueryChange={s.onQueryChange}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <AuditLogTable
        rows={s.rows}
        isLoading={s.loading}
        error={s.error}
        sortBy={s.query.sortBy ?? "timestamp"}
        sortOrder={s.query.sortOrder ?? "desc"}
        onSort={s.onSort}
        onView={s.openView}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <AuditLogPagination
        meta={s.meta}
        isLoading={s.loading}
        onPageChange={s.onPageChange}
        onLimitChange={s.onLimitChange}
      />

      {/* ── View sheet (read-only detail panel) ──────────────────────── */}
      <ViewAuditLogSheet
        open={s.view.open}
        onOpenChange={(open) => { if (!open) s.closeView() }}
        detail={s.view.detail}
        isLoading={s.view.loading}
      />

    </div>
  )
}
