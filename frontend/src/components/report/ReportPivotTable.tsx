/**
 * ReportPivotTable — the RAKE-pivot "Coil Stock" table.
 *
 * Columns, left → right:
 *   fixed (Distr.Channel · Sold To Party · BRANCH · Party Code · Ship To Party,
 *   repeated parents blanked) → optional Detail cols (Transport Mode · Destination
 *   · ROUTE) → dynamic RAKE cols → Total → optional Credit cols. Detail + Credit
 *   are the 8 toggles in the toolbar "Columns" dropdown.
 *
 * Rows are grouped by Distr.Channel with a per-channel **subtotal** row, plus a
 * sticky grand-total footer. Grouping/subtotals come from `buildRenderRows`,
 * which relies on the backend pre-sort. Trailing cell rendering lives in
 * `report-cells.tsx`. Scroll: a bounded box with sticky header + sticky footer.
 */

import { Fragment } from "react"

import {
  Table, TableBody, TableFooter, TableHead, TableHeader, TableRow, TableCell,
} from "@/components/ui/table"
import { Boxes } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportResponse, ReportPivotRow } from "@/types/report/report"
import {
  REPORT_OPTIONAL_COLS,
  fmtQty,
  type ReportDetailColKey,
  type ReportColVisibility,
} from "./report-format"
import {
  buildRenderRows,
  type FixedColKey,
  type ReportAgg,
} from "./report-grouping"
import {
  TRAILING_META,
  trailingBodyCell,
  aggTrailingCell,
  type TrailingKey,
} from "./report-cells"

const FIXED_COLS: { key: FixedColKey; label: string; className: string }[] = [
  { key: "distr_chnl", label: "Distr. Channel", className: "min-w-[110px]" },
  { key: "sold_to_party", label: "Sold To Party", className: "min-w-[160px]" },
  { key: "sales_office", label: "BRANCH", className: "min-w-[110px]" },
  { key: "party_code", label: "Party Code", className: "min-w-[100px]" },
  { key: "ship_to_party", label: "Ship To Party", className: "min-w-[160px]" },
]

const DETAIL_META: Record<ReportDetailColKey, { label: string; thClass: string }> = {
  transport_mode: { label: "Transport Mode", thClass: "min-w-[120px]" },
  destination: { label: "Destination", thClass: "min-w-[120px]" },
  route: { label: "ROUTE", thClass: "min-w-[100px]" },
}

const TH_STICKY = "sticky top-0 z-20 whitespace-nowrap bg-background"

function fixedBodyCell(key: FixedColKey, row: ReportPivotRow, blanked: boolean) {
  if (blanked) return <TableCell />
  switch (key) {
    case "distr_chnl":
      return <TableCell className="text-xs text-foreground">{row.distr_chnl ?? "—"}</TableCell>
    case "sold_to_party":
      return (
        <TableCell className="max-w-[220px]">
          <span className="block truncate text-sm" title={row.sold_to_party ?? undefined}>{row.sold_to_party ?? "—"}</span>
        </TableCell>
      )
    case "sales_office":
      return <TableCell className="text-xs text-muted-foreground">{row.sales_office ?? "—"}</TableCell>
    case "party_code":
      return <TableCell className="font-mono text-xs text-foreground">{row.party_code}</TableCell>
    case "ship_to_party":
      return (
        <TableCell className="max-w-[220px]">
          <span className="block truncate text-sm" title={row.ship_to_party ?? undefined}>{row.ship_to_party ?? "—"}</span>
        </TableCell>
      )
  }
}

function rakeAggCell(col: string, agg: ReportAgg) {
  const v = agg.rake_quantities[col]
  return <TableCell key={col} className="text-right tabular-nums text-xs">{v ? fmtQty(v) : "—"}</TableCell>
}

export function ReportPivotTable({
  report,
  visibleCols,
}: {
  report: ReportResponse
  visibleCols: ReportColVisibility
}) {
  if (report.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Boxes className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No matching stock rows</p>
        <p className="text-xs opacity-70">
          No parties matched this date{report.region_id ? " for the selected region" : ""}.
        </p>
      </div>
    )
  }

  const detailKeys = REPORT_OPTIONAL_COLS
    .filter((c) => c.side === "detail" && visibleCols[c.key])
    .map((c) => c.key as ReportDetailColKey)
  const trailingKeys: TrailingKey[] = REPORT_OPTIONAL_COLS
    .filter((c) => c.side === "credit" && visibleCols[c.key])
    .map((c) => c.key as TrailingKey)
  const leftColSpan = FIXED_COLS.length + detailKeys.length
  const grandAgg: ReportAgg = {
    rake_quantities: {},
    total: report.grand_total,
    nco_yes_do: report.grand_nco_yes_do,
    required_credit: report.grand_required_credit,
  }

  const renderRows = buildRenderRows(report.rows)

  return (
    <Table containerClassName="max-h-[calc(100vh-17rem)] overflow-auto rounded-lg border">
      <TableHeader>
        <TableRow>
          {FIXED_COLS.map((h) => (
            <TableHead key={h.key} className={cn(TH_STICKY, h.className)}>{h.label}</TableHead>
          ))}
          {detailKeys.map((k) => (
            <TableHead key={k} className={cn(TH_STICKY, DETAIL_META[k].thClass)}>{DETAIL_META[k].label}</TableHead>
          ))}
          {report.rake_columns.map((col) => (
            <TableHead key={col} className={cn(TH_STICKY, "text-right min-w-[80px]")}>{col}</TableHead>
          ))}
          {trailingKeys.map((k) => (
            <TableHead key={k} className={cn(TH_STICKY, TRAILING_META[k].thClass)}>{TRAILING_META[k].label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {renderRows.map((rr, idx) =>
          rr.kind === "subtotal" ? (
            <TableRow key={`sub-${idx}`} className="bg-muted/50 font-medium hover:bg-muted/50">
              <TableCell colSpan={leftColSpan} className="text-right text-xs text-foreground">{rr.label}</TableCell>
              {report.rake_columns.map((col) => rakeAggCell(col, rr.agg))}
              {trailingKeys.map((k) => (
                <Fragment key={k}>{aggTrailingCell(k, rr.agg)}</Fragment>
              ))}
            </TableRow>
          ) : (
            <TableRow key={`row-${idx}-${rr.row.party_code}`}>
              {FIXED_COLS.map((h) => (
                <Fragment key={h.key}>{fixedBodyCell(h.key, rr.row, rr.blank[h.key])}</Fragment>
              ))}
              {detailKeys.map((k) => (
                <TableCell key={k} className="text-xs text-muted-foreground">{rr.row[k] ?? "—"}</TableCell>
              ))}
              {report.rake_columns.map((col) => (
                <TableCell key={col} className="text-right tabular-nums text-xs">
                  {rr.row.rake_quantities[col] ? fmtQty(rr.row.rake_quantities[col]) : "—"}
                </TableCell>
              ))}
              {trailingKeys.map((k) => (
                <Fragment key={k}>{trailingBodyCell(k, rr.row)}</Fragment>
              ))}
            </TableRow>
          ),
        )}
      </TableBody>

      <TableFooter>
        <TableRow className="sticky bottom-0 z-20 bg-muted font-semibold hover:bg-transparent">
          <TableCell colSpan={leftColSpan} className="text-right text-sm text-foreground">Grand Total</TableCell>
          {report.rake_columns.map((col) => (
            <TableCell key={col} />
          ))}
          {trailingKeys.map((k) => (
            <Fragment key={k}>{aggTrailingCell(k, grandAgg)}</Fragment>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
}
