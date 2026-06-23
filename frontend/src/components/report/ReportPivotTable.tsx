/**
 * ReportPivotTable — the RAKE-pivot "Coil Stock" table.
 *
 * Rows: Distr. Channel → Sold To Party → BRANCH → Party Code → Ship-To Party →
 * Transport Mode → Destination → ROUTE. (SO Sales Org is intentionally not shown.)
 * Columns: dynamic RAKE values (only those with stock) + Total + the optional
 * trailing columns toggled from the toolbar.
 *
 * Scroll: the table owns a bounded box (sticky header + sticky grand-total
 * footer) so long/wide reports scroll inside it instead of the whole page.
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
  fmtQty, fmtINR, signClass,
  type ReportColKey, type ReportColVisibility,
} from "./report-format"

function BlockedCell({ blocked, creditStatus }: { blocked: boolean | null; creditStatus: string }) {
  if (creditStatus === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">N/A</span>
  }
  if (blocked === null) return <span className="text-muted-foreground/60">—</span>
  if (blocked) return <span className="text-xs font-semibold text-destructive">Blocked</span>
  return <span className="font-medium text-emerald-600 dark:text-emerald-400">No</span>
}

function CreditBalanceCell({ row }: { row: ReportPivotRow }) {
  if (row.credit_status === "NO CREDIT REPORT FOUND") {
    return <span className="text-xs italic text-amber-600">NO CREDIT REPORT FOUND</span>
  }
  if (row.credit_status === "No Credit balance") {
    return <span className="text-xs italic text-muted-foreground">No Credit balance</span>
  }
  return (
    <span className={cn("tabular-nums", signClass(row.credit_balance))}>
      {fmtINR(row.credit_balance)}
    </span>
  )
}

function CreditNoteCell({ note }: { note: string }) {
  const cls =
    note === "Balance Available"
      ? "text-emerald-600 dark:text-emerald-400"
      : note === "Not Enough Balance" || note === "Balance Negative"
        ? "text-destructive"
        : "text-muted-foreground italic"
  return <span className={cn("text-xs font-medium", cls)}>{note || "—"}</span>
}

// Trailing columns: "total" is always shown; the rest are toggleable.
type TrailingKey = "total" | ReportColKey

const TRAILING_META: Record<TrailingKey, { label: string; thClass: string }> = {
  total:           { label: "Total",           thClass: "text-right min-w-[90px]" },
  yes_do:          { label: "Yes+DO",          thClass: "text-center min-w-[100px]" },
  blocked:         { label: "Blocked",         thClass: "text-center min-w-[90px]" },
  credit_balance:  { label: "Credit Balance",  thClass: "text-right min-w-[120px]" },
  required_credit: { label: "Required Credit", thClass: "text-right min-w-[120px]" },
  credit_note:     { label: "Credit Note",     thClass: "text-center min-w-[140px]" },
}

function trailingBodyCell(key: TrailingKey, row: ReportPivotRow) {
  switch (key) {
    case "total":
      return <TableCell className="text-right tabular-nums font-medium">{fmtQty(row.total)}</TableCell>
    case "yes_do":
      return (
        <TableCell
          className="text-center tabular-nums text-muted-foreground text-xs"
          title={`${row.nco_yes_do_count} delivery(s) with NCO Yes + DO`}
        >
          {row.nco_yes_do ? fmtQty(row.nco_yes_do) : "—"}
        </TableCell>
      )
    case "blocked":
      return <TableCell className="text-center"><BlockedCell blocked={row.blocked} creditStatus={row.credit_status} /></TableCell>
    case "credit_balance":
      return <TableCell className="text-right"><CreditBalanceCell row={row} /></TableCell>
    case "required_credit":
      return (
        <TableCell className="text-right tabular-nums text-xs">
          {row.required_credit !== null ? fmtINR(row.required_credit) : "—"}
        </TableCell>
      )
    case "credit_note":
      return <TableCell className="text-center"><CreditNoteCell note={row.credit_note} /></TableCell>
  }
}

function trailingFooterCell(key: TrailingKey, report: ReportResponse) {
  switch (key) {
    case "total":
      return <TableCell className="text-right tabular-nums">{fmtQty(report.grand_total)}</TableCell>
    case "yes_do":
      return (
        <TableCell className="text-center tabular-nums text-muted-foreground text-xs">
          {report.grand_nco_yes_do ? fmtQty(report.grand_nco_yes_do) : "—"}
        </TableCell>
      )
    case "required_credit":
      return (
        <TableCell className="text-right tabular-nums text-xs">
          {report.grand_required_credit !== null ? fmtINR(report.grand_required_credit) : "—"}
        </TableCell>
      )
    default:
      return <TableCell />
  }
}

const FIXED_COLS = [
  { label: "Distr. Channel",  className: "min-w-[110px]" },
  { label: "Sold To Party",   className: "min-w-[160px]" },
  { label: "BRANCH",          className: "min-w-[110px]" },
  { label: "Party Code",      className: "min-w-[100px]" },
  { label: "Ship To Party",   className: "min-w-[160px]" },
  { label: "Transport Mode",  className: "min-w-[120px]" },
  { label: "Destination",     className: "min-w-[120px]" },
  { label: "ROUTE",           className: "min-w-[100px]" },
]

const TH_STICKY = "sticky top-0 z-20 whitespace-nowrap bg-background"

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

  const trailingKeys: TrailingKey[] = [
    "total",
    ...REPORT_OPTIONAL_COLS.map((c) => c.key).filter((k) => visibleCols[k]),
  ]

  return (
    <Table containerClassName="max-h-[calc(100vh-17rem)] overflow-auto rounded-lg border">
      <TableHeader>
        <TableRow>
          {FIXED_COLS.map((h) => (
            <TableHead key={h.label} className={cn(TH_STICKY, h.className)}>{h.label}</TableHead>
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
        {report.rows.map((row, idx) => (
          <TableRow key={`${idx}-${row.party_code}`}>
            <TableCell className="text-xs text-foreground">{row.distr_chnl ?? "—"}</TableCell>
            <TableCell className="max-w-[220px]">
              <span className="block truncate text-sm" title={row.sold_to_party ?? undefined}>
                {row.sold_to_party ?? "—"}
              </span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.sales_office ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs text-foreground">{row.party_code}</TableCell>
            <TableCell className="max-w-[220px]">
              <span className="block truncate text-sm" title={row.ship_to_party ?? undefined}>
                {row.ship_to_party ?? "—"}
              </span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.transport_mode ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.destination ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.route ?? "—"}</TableCell>

            {report.rake_columns.map((col) => (
              <TableCell key={col} className="text-right tabular-nums text-xs">
                {row.rake_quantities[col] ? fmtQty(row.rake_quantities[col]) : "—"}
              </TableCell>
            ))}

            {trailingKeys.map((k) => (
              <Fragment key={k}>{trailingBodyCell(k, row)}</Fragment>
            ))}
          </TableRow>
        ))}
      </TableBody>

      <TableFooter>
        <TableRow className="sticky bottom-0 z-20 bg-muted font-semibold hover:bg-transparent">
          <TableCell colSpan={FIXED_COLS.length} className="text-right text-sm text-foreground">
            Grand Total
          </TableCell>
          {report.rake_columns.map((col) => (
            <TableCell key={col} />
          ))}
          {trailingKeys.map((k) => (
            <Fragment key={k}>{trailingFooterCell(k, report)}</Fragment>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
}
