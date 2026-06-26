/**
 * ReportSection — renders the report block with two tabs:
 *   "Branch Wise Report" (the RAKE pivot table, default)
 *   "Total Rake Report"  (RAKE totals + Transport Mode totals)
 *
 * The RAKE drill-down state lives here (not in RakeTotalsTab) so the drill-down
 * controls (Back · RAKE title · Merged/Unmerged toggle) render on the SAME row as
 * the tab switcher instead of stacking below it.
 */

import { useCallback, useState, type ReactNode } from "react"
import { Info, FileX2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePersistedState } from "@/hooks/usePersistedState"
import type { ReportResponse } from "@/types/report/report"
import { ReportPivotTable } from "./ReportPivotTable"
import { RakeTotalsTab } from "./RakeTotalsTab"
import { RakeDrilldownTable, type DrilldownMode } from "./RakeDrilldownTable"
import { useRakeDrilldown } from "./hooks/useRakeDrilldown"
import { matchInfoFor, type ExcludedEntry, type RakeExclusions } from "./rake-exclusions"
import { fmtINR, type ReportColVisibility } from "./report-format"

const DRILL_TABS: readonly [DrilldownMode, string][] = [
  ["merged", "Total Rake Wise"],
  ["raw", "Batch Rake Wise"],
]

/** One label/value pair in the summary meta strip. */
function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ReportSection({
  report,
  visibleCols,
  groupBySoOrg,
  exclusions,
  onToggleExclusion,
}: {
  report: ReportResponse
  visibleCols: ReportColVisibility
  /** Both mode: lead the table with an SO Sales Org column + subtotal per org. */
  groupBySoOrg: boolean
  /** Browser-only RAKE drill-down exclusions (subtract from totals + export). */
  exclusions: RakeExclusions
  onToggleExclusion: (rake: string, key: string, entry: ExcludedEntry) => void
}) {
  // Persist the active tab so it survives navigation (sliding 1h TTL).
  const [tab, setTab] = usePersistedState<"branch" | "rake">("mra:report:tab", "branch")
  const drill = useRakeDrilldown(report)
  const [mode, setMode] = useState<DrilldownMode>("merged")

  // Excluding a row drops the WHOLE merge group; matchQty is its stock-scoped total
  // (computed from the unmerged rows, which carry stock_type).
  const handleToggleRow = useCallback(
    (key: string) => {
      if (!drill.rake || !drill.data) return
      onToggleExclusion(drill.rake, key, matchInfoFor(drill.data.rows, key, report.report_type))
    },
    [drill.rake, drill.data, report.report_type, onToggleExclusion],
  )
  const drilled = drill.rake !== null
  const drillRows = drill.data
    ? mode === "merged"
      ? drill.data.merged_rows.length
      : drill.data.rows.length
    : 0

  return (
    <div className="flex flex-col gap-3">
      {!report.has_stock ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileX2 className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium text-foreground">No stock excel for this date selected</p>
          <p className="text-xs text-muted-foreground">
            No {report.report_type.toUpperCase()} stock report was ingested for {report.date}.
          </p>
        </div>
      ) : (
        <>
          {/* Summary meta strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
            <MetaItem label="Report" value={report.report_type.toUpperCase()} />
            <MetaItem label="Date" value={report.date} />
            <MetaItem label="Region" value={report.region_name} />
            <MetaItem label="CCA" value={report.ccas.join(", ")} />
            <MetaItem label="Coil price/qty" value={fmtINR(report.coil_price_per_qty)} />
          </div>

          {/* No-credit banner */}
          {!report.has_credit_report && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <Info className="mt-px size-4 shrink-0" aria-hidden />
              <span>
                No credit report was ingested for {report.date} — credit columns show "NO CREDIT REPORT FOUND".
              </span>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as "branch" | "rake")}>
            {/* One row: tab switcher (left) + drill-down controls (right, when drilled) */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <TabsList className="h-9">
                <TabsTrigger value="branch" className="px-3">Branch Wise Report</TabsTrigger>
                <TabsTrigger value="rake" className="px-3">Total Rake Report</TabsTrigger>
              </TabsList>

              {tab === "rake" && drilled && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={drill.close} className="h-9 gap-1.5">
                    <ArrowLeft className="size-4" aria-hidden />
                    Back
                  </Button>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      RAKE <span className="text-primary">{drill.rake}</span>
                    </h3>
                    {drill.data ? (
                      <span className="text-xs text-muted-foreground">
                        {drillRows} row{drillRows === 1 ? "" : "s"} · jsw + jvml
                      </span>
                    ) : null}
                  </div>
                  <div
                    role="group"
                    aria-label="Drill-down view"
                    className="inline-flex h-9 w-fit items-center rounded-lg border border-border bg-muted/60 p-1"
                  >
                    {DRILL_TABS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMode(value)}
                        aria-pressed={mode === value}
                        className={
                          "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                          (mode === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="branch">
              <ReportPivotTable report={report} visibleCols={visibleCols} groupBySoOrg={groupBySoOrg} />
            </TabsContent>

            <TabsContent value="rake">
              {drilled ? (
                <RakeDrilldownTable
                  data={drill.data}
                  loading={drill.loading}
                  error={drill.error}
                  mode={mode}
                  rake={drill.rake}
                  exclusions={exclusions}
                  onToggleRow={handleToggleRow}
                />
              ) : (
                <RakeTotalsTab
                  report={report}
                  exclusions={exclusions}
                  onRakeClick={(rake) => {
                    setMode("merged")
                    drill.open(rake)
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
