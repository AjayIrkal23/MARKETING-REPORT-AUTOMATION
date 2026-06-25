/**
 * ReportSection — renders the report block: summary line, the no-stock empty
 * state / no-credit banner, and the pivot table.
 *
 * For the "both" selection the backend returns one merged response, so this is
 * still a single section — `groupBySoOrg` just switches the table to an SO Sales
 * Org-led, SO-Org-grouped layout.
 */

import { Info, FileX2 } from "lucide-react"

import type { ReportResponse } from "@/types/report/report"
import { ReportPivotTable } from "./ReportPivotTable"
import { fmtINR, type ReportColVisibility } from "./report-format"

export function ReportSection({
  report,
  visibleCols,
  groupBySoOrg,
}: {
  report: ReportResponse
  visibleCols: ReportColVisibility
  /** Both mode: lead the table with an SO Sales Org column + subtotal per org. */
  groupBySoOrg: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {!report.has_stock ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <FileX2 className="size-8 opacity-50" aria-hidden />
          <p className="text-sm font-medium text-foreground">No stock excel for this date selected</p>
          <p className="text-xs">
            No {report.report_type.toUpperCase()} stock report was ingested for {report.date}.
          </p>
        </div>
      ) : (
        <>
          {/* Summary line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{report.report_type.toUpperCase()}</strong> · {report.date}</span>
            <span>Region: <strong className="text-foreground">{report.region_name}</strong></span>
            <span>CCA: <strong className="text-foreground">{report.ccas.join(", ")}</strong></span>
            <span>Coil price/qty: <strong className="text-foreground">{fmtINR(report.coil_price_per_qty)}</strong></span>
          </div>

          {/* No-credit banner */}
          {!report.has_credit_report && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <Info className="size-4 shrink-0" aria-hidden />
              No credit report was ingested for {report.date} — credit columns show "NO CREDIT REPORT FOUND".
            </div>
          )}

          <ReportPivotTable report={report} visibleCols={visibleCols} groupBySoOrg={groupBySoOrg} />
        </>
      )}
    </div>
  )
}
