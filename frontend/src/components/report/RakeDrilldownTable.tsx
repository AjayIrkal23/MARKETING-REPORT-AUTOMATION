import { Loader2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { RakeDrilldownResponse, RakeDrilldownRow } from "@/types/report/report"
import { isExcluded, rowKey, type RakeExclusions } from "./rake-exclusions"

export type DrilldownMode = "merged" | "raw"

type Col = { key: string; label: string; right?: boolean }

const COLS_RAW: Col[] = [
  { key: "stock_type", label: "Source" },
  { key: "so_sales_org", label: "Sales Org" },
  { key: "distr_chnl", label: "Distr Channel" },
  { key: "sales_office", label: "BRANCH" },
  { key: "sold_to_party", label: "Sold To Party" },
  { key: "party_code", label: "Party Code" },
  { key: "ship_to_party", label: "Ship To Party" },
  { key: "transport_mode", label: "Transport Mode" },
  { key: "destination", label: "Destination" },
  { key: "customer_name", label: "Customer" },
  { key: "stock_quantity", label: "Qty", right: true },
]

// Merged view drops the two columns NOT in the merge key (Source, Ship To Party).
const COLS_MERGED: Col[] = COLS_RAW.filter(
  (c) => c.key !== "stock_type" && c.key !== "ship_to_party",
)

const TH_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-foreground/70"
const fmtQty = (n: number) => n.toLocaleString("en-IN")

/**
 * Drill-down body for one RAKE — the table only. Back button, RAKE title, and the
 * Merged/Unmerged toggle live in `ReportSection` (on the tab-bar row); `mode` is
 * passed in. Both row sets ride in one payload, so the toggle never refetches.
 */
export function RakeDrilldownTable({
  data,
  loading,
  error,
  mode,
  rake,
  exclusions,
  onToggleRow,
}: {
  data: RakeDrilldownResponse | null
  loading: boolean
  error: string | null
  mode: DrilldownMode
  /** The open RAKE — exclusions are keyed per rake. */
  rake: string | null
  exclusions: RakeExclusions
  /** Toggle one row's exclusion (key = canonical 8-field identity). */
  onToggleRow: (key: string) => void
}) {
  const cols = mode === "merged" ? COLS_MERGED : COLS_RAW
  const rows = (
    mode === "merged" ? (data?.merged_rows ?? []) : (data?.rows ?? [])
  ) as unknown as Record<string, string | number | null>[]

  // Footer reflects only CHECKED visible rows (mode-aware union view), rounded to
  // 3dp to match the backend; excluded rows drop out of both totals and export.
  const checkedTotal =
    Math.round(
      rows.reduce(
        (s, row) =>
          isExcluded(exclusions, rake, rowKey(row as unknown as RakeDrilldownRow))
            ? s
            : s + Number(row.stock_quantity ?? 0),
        0,
      ) * 1000,
    ) / 1000

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading rows…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table containerClassName="max-h-[60vh] overflow-auto">
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className={cn(TH_CLASS, "w-12 text-center")}>Incl.</TableHead>
            {cols.map((c) => (
              <TableHead key={c.key} className={cn(TH_CLASS, c.right && "text-right")}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, i) => {
              const key = rowKey(row as unknown as RakeDrilldownRow)
              const checked = !isExcluded(exclusions, rake, key)
              return (
              <TableRow key={i} className={cn("hover:bg-muted/40", !checked && "opacity-50")}>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer accent-primary align-middle"
                    checked={checked}
                    onChange={() => onToggleRow(key)}
                    aria-label={checked ? "Exclude row from totals and export" : "Include row"}
                  />
                </TableCell>
                {cols.map((c) => {
                  if (c.key === "stock_quantity") {
                    return (
                      <TableCell key={c.key} className="text-right tabular-nums">
                        {fmtQty(Number(row.stock_quantity ?? 0))}
                      </TableCell>
                    )
                  }
                  if (c.key === "stock_type") {
                    return (
                      <TableCell
                        key={c.key}
                        className="text-xs font-medium uppercase text-muted-foreground"
                      >
                        {row.stock_type}
                      </TableCell>
                    )
                  }
                  return <TableCell key={c.key}>{row[c.key] ?? "—"}</TableCell>
                })}
              </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={cols.length + 1}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No stock rows for this RAKE on {data?.date ?? "this date"}.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {rows.length > 0 ? (
          <TableFooter>
            <TableRow className="bg-muted">
              <TableCell colSpan={cols.length} className="font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {fmtQty(checkedTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  )
}
