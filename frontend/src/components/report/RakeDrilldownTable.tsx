import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RakeDrilldownResponse } from "@/types/report/report"

const COLS: { key: string; label: string; right?: boolean }[] = [
  { key: "stock_type", label: "Source" },
  { key: "so_sales_org", label: "Sales Org" },
  { key: "distr_chnl", label: "Distr Channel" },
  { key: "sold_to_party", label: "Sold To Party" },
  { key: "sales_office", label: "BRANCH" },
  { key: "party_code", label: "Party Code" },
  { key: "ship_to_party", label: "Ship To Party" },
  { key: "transport_mode", label: "Transport Mode" },
  { key: "destination", label: "Destination" },
  { key: "customer_name", label: "Customer" },
  { key: "stock_quantity", label: "Qty", right: true },
]

const fmtQty = (n: number) => n.toLocaleString("en-IN")

export function RakeDrilldownTable({
  rake,
  data,
  loading,
  error,
  onBack,
}: {
  rake: string
  data: RakeDrilldownResponse | null
  loading: boolean
  error: string | null
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-2" aria-hidden />
          Back
        </Button>
        <h3 className="text-sm font-semibold text-foreground">
          RAKE <span className="text-primary">{rake}</span>
          {data ? (
            <span className="ml-2 font-normal text-muted-foreground">
              {data.rows.length} row{data.rows.length === 1 ? "" : "s"} · jsw + jvml
            </span>
          ) : null}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading rows…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table containerClassName="max-h-[60vh] overflow-auto">
            <TableHeader>
              <TableRow className="bg-muted/50">
                {COLS.map((c) => (
                  <TableHead
                    key={c.key}
                    className={c.right ? "text-right" : undefined}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data && data.rows.length > 0 ? (
                data.rows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="uppercase text-xs font-medium text-muted-foreground">
                      {row.stock_type}
                    </TableCell>
                    <TableCell>{row.so_sales_org ?? "—"}</TableCell>
                    <TableCell>{row.distr_chnl ?? "—"}</TableCell>
                    <TableCell>{row.sold_to_party ?? "—"}</TableCell>
                    <TableCell>{row.sales_office ?? "—"}</TableCell>
                    <TableCell>{row.party_code ?? "—"}</TableCell>
                    <TableCell>{row.ship_to_party ?? "—"}</TableCell>
                    <TableCell>{row.transport_mode ?? "—"}</TableCell>
                    <TableCell>{row.destination ?? "—"}</TableCell>
                    <TableCell>{row.customer_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtQty(row.stock_quantity)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={COLS.length}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No stock rows for this RAKE on {data?.date ?? "this date"}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {data && data.rows.length > 0 ? (
              <TableFooter>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={COLS.length - 1} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmtQty(data.total_quantity)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}
    </div>
  )
}
