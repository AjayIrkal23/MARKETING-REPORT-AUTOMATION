/**
 * CreditReportTable — server-driven sortable table for the Credit Report screen.
 * Cols: Report Date · Customer · Customer Name · City · CCA · CCA Description
 *   · Blocked · Credit Limit · Credit Exposure · Credit Balance · Overdue · actions
 * prop is `loading` (NOT `isLoading`).
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, ArrowUpDown, CreditCard, AlertCircle, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreditReportSortBy } from "@/types/credit-report/credit-report"
import type { CreditReportTableProps } from "@/types/credit-report/credit-report-ui"

// ── Constants ─────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8
const SKELETON_WIDTHS = ["w-20","w-24","w-40","w-36","w-20","w-32","w-16","w-24","w-24","w-24","w-20"] as const
// ── SortableHead ──────────────────────────────────────────────────────────────

interface SortableHeadProps {
  label: string
  col: CreditReportSortBy
  current: CreditReportSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: CreditReportSortBy) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon
          className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")}
          aria-hidden
        />
      </span>
    </TableHead>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtINR(v: number | null | undefined): string {
  if (v == null) return "—"
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function signClass(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground"
  if (v < 0) return "text-destructive"
  if (v > 0) return "text-emerald-600 dark:text-emerald-400"
  return "text-muted-foreground"
}

// ── Main component ────────────────────────────────────────────────────────────

export function CreditReportTable({
  rows, loading, error, sortBy, sortOrder, onSort, onView,
}: CreditReportTableProps) {

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Report Date", "Customer", "Customer Name", "City",
              "CCA", "CCA Description", "Blocked", "Credit Limit",
              "Credit Exposure", "Credit Balance", "Overdue", "",
            ].map((h, i) => (
              <TableHead key={i} className="text-muted-foreground">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {SKELETON_WIDTHS.map((w, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton className={cn("h-3.5", w)} />
                </TableCell>
              ))}
              <TableCell>
                <Skeleton className="size-7 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-16 text-destructive"
      >
        <AlertCircle className="size-8 opacity-70 shrink-0" aria-hidden />
        <p className="text-sm font-medium">Failed to load credit report records</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <CreditCard className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No credit report records found</p>
        <p className="text-xs opacity-70">Adjust the filters or wait for the next scheduled ingestion.</p>
      </div>
    )
  }

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Report Date"     col="report_date"        {...sortProps} className="min-w-[100px]" />
          <SortableHead label="Customer"        col="customer"           {...sortProps} className="min-w-[100px]" />
          <SortableHead label="Customer Name"   col="customer_name"      {...sortProps} className="min-w-[180px]" />
          <SortableHead label="City"            col="city"               {...sortProps} className="min-w-[110px]" />
          <SortableHead label="CCA"             col="credit_control_area" {...sortProps} className="min-w-[80px]" />
          <SortableHead label="CCA Description" col="cca_description"    {...sortProps} className="min-w-[160px]" />
          <SortableHead label="Blocked"         col="blocked"            {...sortProps} className="min-w-[90px]" />
          <SortableHead label="Credit Limit"    col="cca_credit_limit"   {...sortProps} className="min-w-[120px] text-right" />
          <SortableHead label="Credit Exposure" col="credit_exposure"    {...sortProps} className="min-w-[130px] text-right" />
          <SortableHead label="Credit Balance"  col="credit_balance"     {...sortProps} className="min-w-[130px] text-right" />
          <SortableHead label="Overdue"         col="overdue"            {...sortProps} className="min-w-[110px] text-right" />
          {/* Actions column — no label */}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>

            {/* Report Date — verbatim string, do NOT parse */}
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {row.report_date}
            </TableCell>

            {/* Customer */}
            <TableCell className="max-w-[140px]">
              <span
                className="truncate block text-sm font-mono text-foreground"
                title={row.customer ?? undefined}
              >
                {row.customer ?? "—"}
              </span>
            </TableCell>

            {/* Customer Name */}
            <TableCell className="max-w-[220px]">
              <span
                className="truncate block text-sm font-medium text-foreground"
                title={row.customer_name ?? undefined}
              >
                {row.customer_name ?? "—"}
              </span>
            </TableCell>

            {/* City */}
            <TableCell className="text-sm text-muted-foreground">
              {row.city ?? "—"}
            </TableCell>

            {/* CCA */}
            <TableCell className="text-sm text-muted-foreground">
              {row.credit_control_area ?? "—"}
            </TableCell>

            {/* CCA Description */}
            <TableCell className="text-sm text-muted-foreground max-w-[200px]">
              <span className="truncate block" title={row.cca_description ?? undefined}>
                {row.cca_description ?? "—"}
              </span>
            </TableCell>

            {/* Blocked */}
            <TableCell>
              {row.blocked === "X"
                ? <Badge variant="destructive">Blocked</Badge>
                : <span className="text-muted-foreground">—</span>
              }
            </TableCell>

            {/* Credit Limit — plain muted INR */}
            <TableCell className="text-sm text-muted-foreground text-right tabular-nums">
              {fmtINR(row.cca_credit_limit)}
            </TableCell>

            {/* Credit Exposure — sign-colored */}
            <TableCell className={cn("text-sm text-right tabular-nums", signClass(row.credit_exposure))}>
              {fmtINR(row.credit_exposure)}
            </TableCell>

            {/* Credit Balance — sign-colored */}
            <TableCell className={cn("text-sm text-right tabular-nums", signClass(row.credit_balance))}>
              {fmtINR(row.credit_balance)}
            </TableCell>

            {/* Overdue — red when > 0, muted otherwise */}
            <TableCell className={cn(
              "text-sm text-right tabular-nums",
              row.overdue != null && row.overdue > 0 ? "text-destructive" : "text-muted-foreground",
            )}>
              {fmtINR(row.overdue)}
            </TableCell>

            {/* Actions — view button */}
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onView(row)}
                aria-label={`View credit report for ${row.customer_name ?? row.customer ?? row.id}`}
              >
                <Eye className="size-3.5" aria-hidden />
              </Button>
            </TableCell>

          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default CreditReportTable
