import { ChevronRight } from "lucide-react"

import type { ReportResponse } from "@/types/report/report"
import { subtractFor, transportSubtract, type RakeExclusions } from "./rake-exclusions"

function TotalsTable({
  title,
  rows,
  grandTotal,
  onRowClick,
}: {
  title: string
  rows: [string, number][]
  grandTotal: number
  onRowClick?: (label: string) => void
}) {
  const clickable = Boolean(onRowClick)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {clickable && (
          <span className="text-[11px] text-muted-foreground">Select a RAKE to drill down</span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                {title}
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                Total Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, qty]) => (
              <tr
                key={label}
                className={
                  "group border-b last:border-0 transition-colors " +
                  (clickable ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30")
                }
                onClick={clickable ? () => onRowClick?.(label) : undefined}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onRowClick?.(label)
                        }
                      }
                    : undefined
                }
              >
                <td
                  className={
                    "px-4 py-2.5 font-medium " + (clickable ? "text-primary" : "text-foreground")
                  }
                >
                  {clickable ? (
                    <span className="inline-flex items-center gap-1.5">
                      {label}
                      <ChevronRight
                        className="size-3.5 -translate-x-0.5 text-primary/60 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                  ) : (
                    label
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {qty.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No data
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted">
                <td className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                  Grand Total
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                  {grandTotal.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export function RakeTotalsTab({
  report,
  exclusions,
  onRakeClick,
}: {
  report: ReportResponse
  /** Browser-only RAKE exclusions — subtracted from each RAKE figure (not transport mode). */
  exclusions: RakeExclusions
  /** Click a RAKE row → open its drill-down (state lives in ReportSection). */
  onRakeClick: (rake: string) => void
}) {
  // Subtract each row's browser-only excluded qty (clamped ≥ 0) from BOTH the RAKE
  // totals (grouped by rake) and the Transport Mode totals (same unchecks regrouped
  // by transport mode).
  const tmSub = transportSubtract(exclusions)
  const rakeRows = Object.entries(report.rake_totals)
    .map(([rake, qty]) => [rake, Math.max(0, qty - subtractFor(exclusions, rake))] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]))
  const tmRows = Object.entries(report.transport_mode_totals)
    .map(([tm, qty]) => [tm, Math.max(0, qty - (tmSub[tm] ?? 0))] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]))
  const rakeGrand = rakeRows.reduce((s, [, v]) => s + v, 0)
  const tmGrand = tmRows.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="flex flex-col gap-6">
      <TotalsTable title="RAKE" rows={rakeRows} grandTotal={rakeGrand} onRowClick={onRakeClick} />
      <TotalsTable title="Transport Mode" rows={tmRows} grandTotal={tmGrand} />
    </div>
  )
}
