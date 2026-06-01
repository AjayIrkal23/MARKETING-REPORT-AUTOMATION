/**
 * JvmlStockTable — server-driven sortable table for the JVML Stock List screen.
 * Cols: Report Date · Party Code · Customer Name · Sold To Party ·
 *   Material · JSW Grade · Sales Office · Distr.Chnl · Unrestr Qty · Stock Qty · actions
 * Loading: 8 skeleton rows. Empty: Boxes. Error: AlertCircle.
 * Table prop is `loading` (NOT `isLoading`) — FE-3 asymmetry.
 */
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, ArrowUpDown, Boxes, AlertCircle, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JvmlStockSortBy } from "@/types/jvml-stock/stock"
import type { JvmlStockTableProps } from "@/types/jvml-stock/stock-ui"

// ── Constants ─────────────────────────────────────────────────────────────────

const SKELETON_ROWS = 8
const SKELETON_WIDTHS = ["w-20","w-24","w-36","w-32","w-32","w-28","w-28","w-20","w-16","w-16"]

// ── SortableHead ──────────────────────────────────────────────────────────────

interface SortableHeadProps {
  label: string
  col: JvmlStockSortBy
  current: JvmlStockSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
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

function fmtQty(val: number | null | undefined): string {
  return val === null || val === undefined ? "—" : val.toLocaleString()
}

// ── Main component ────────────────────────────────────────────────────────────

export function JvmlStockTable({
  rows, loading, error, sortBy, sortOrder, onSort, onView,
}: JvmlStockTableProps) {

  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Report Date", "Party Code", "Customer Name",
              "Sold To Party", "Material", "JSW Grade", "Sales Office",
              "Distr.Chnl", "Unrestr Qty", "Stock Qty", "",
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
              {/* actions cell */}
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
        <p className="text-sm font-medium">Failed to load stock records</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Boxes className="size-8 opacity-40" aria-hidden />
        <p className="text-sm font-medium">No stock records found</p>
        <p className="text-xs opacity-70">Adjust the filters or wait for the next scheduled ingestion.</p>
      </div>
    )
  }

  const sortProps = { current: sortBy, order: sortOrder, onSort }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Report Date"    col="report_date"    {...sortProps} className="min-w-[100px]" />
          <SortableHead label="Party Code"     col="party_code"     {...sortProps} className="min-w-[100px]" />
          <SortableHead label="Customer Name"  col="customer_name"  {...sortProps} className="min-w-[160px]" />
          <SortableHead label="Sold To Party"  col="sold_to_party"  {...sortProps} className="min-w-[120px]" />
          <SortableHead label="Material"       col="material"       {...sortProps} className="min-w-[120px]" />
          <SortableHead label="JSW Grade"      col="jsw_grade"      {...sortProps} className="min-w-[110px]" />
          <SortableHead label="Sales Office"   col="sales_office"   {...sortProps} className="min-w-[110px]" />
          <SortableHead label="Distr.Chnl"     col="distr_chnl"     {...sortProps} className="min-w-[90px]"  />
          <SortableHead label="Unrestr Qty"    col="unrestr_qty"    {...sortProps} className="min-w-[90px] text-right" />
          <SortableHead label="Stock Qty"      col="stock_quantity" {...sortProps} className="min-w-[90px] text-right" />
          {/* Actions column — no label */}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>

            {/* Report Date — verbatim "dd-mm-yyyy" string, do NOT parse */}
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {row.report_date}
            </TableCell>

            {/* Party Code — monospace */}
            <TableCell>
              <span className="font-mono text-xs text-foreground">
                {row.party_code ?? "—"}
              </span>
            </TableCell>

            {/* Customer Name — italic em-dash when null (mapped field) */}
            <TableCell className="max-w-[200px]">
              {row.customer_name != null ? (
                <span
                  className="truncate block text-sm text-foreground"
                  title={row.customer_name}
                >
                  {row.customer_name}
                </span>
              ) : (
                <span className="italic text-muted-foreground/60">—</span>
              )}
            </TableCell>

            {/* Sold To Party */}
            <TableCell className="text-sm text-muted-foreground">
              {row.sold_to_party ?? "—"}
            </TableCell>

            {/* Material */}
            <TableCell className="text-sm text-muted-foreground">
              {row.material ?? "—"}
            </TableCell>

            {/* JSW Grade */}
            <TableCell className="text-sm text-muted-foreground">
              {row.jsw_grade ?? "—"}
            </TableCell>

            {/* Sales Office */}
            <TableCell className="text-sm text-muted-foreground">
              {row.sales_office ?? "—"}
            </TableCell>

            {/* Distr.Chnl */}
            <TableCell className="text-sm text-muted-foreground">
              {row.distr_chnl ?? "—"}
            </TableCell>

            {/* Unrestr Qty — tabular-nums, right-aligned */}
            <TableCell className="text-sm text-muted-foreground text-right tabular-nums">
              {fmtQty(row.unrestr_qty)}
            </TableCell>

            {/* Stock Qty — tabular-nums, right-aligned */}
            <TableCell className="text-sm text-muted-foreground text-right tabular-nums">
              {fmtQty(row.stock_quantity)}
            </TableCell>

            {/* Actions — view button */}
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onView(row)}
                aria-label={`View stock record for ${row.customer_name ?? row.party_code ?? row.id}`}
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

export default JvmlStockTable
