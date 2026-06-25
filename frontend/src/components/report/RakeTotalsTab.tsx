import { useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { exportRakeTotals } from "@/api/report/export"
import type { ReportResponse } from "@/types/report/report"

function TotalsTable({
  title,
  rows,
  grandTotal,
}: {
  title: string
  rows: [string, number][]
  grandTotal: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{title}</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, qty]) => (
              <tr key={label} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-medium text-foreground">{label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{qty.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground text-xs">
                  No data
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t">
                <td className="px-4 py-2.5 font-semibold text-foreground">Grand Total</td>
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

export function RakeTotalsTab({ report }: { report: ReportResponse }) {
  const [exporting, setExporting] = useState(false)

  const rakeRows = Object.entries(report.rake_totals).sort((a, b) => a[0].localeCompare(b[0]))
  const tmRows = Object.entries(report.transport_mode_totals).sort((a, b) => a[0].localeCompare(b[0]))
  const rakeGrand = rakeRows.reduce((s, [, v]) => s + v, 0)
  const tmGrand = tmRows.reduce((s, [, v]) => s + v, 0)

  const handleExport = () => {
    setExporting(true)
    exportRakeTotals({
      date: report.date,
      report_type: report.report_type,
      days: report.days_filter,
      region_id: report.region_id ?? undefined,
    })
      .finally(() => setExporting(false))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="size-4 mr-2 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4 mr-2" aria-hidden />
          )}
          Export
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TotalsTable title="RAKE" rows={rakeRows} grandTotal={rakeGrand} />
        <TotalsTable title="Transport Mode" rows={tmRows} grandTotal={tmGrand} />
      </div>
    </div>
  )
}
