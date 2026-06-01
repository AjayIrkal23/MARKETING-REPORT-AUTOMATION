/**
 * ViewJvmlStockDialog — premium read-only detail modal for a JVML Stock row.
 *
 * Replaces the old right-side Sheet with a centered Dialog: a tinted header
 * carrying the record identity (icon chip + customer + status badges), a
 * scrollable multi-column field grid grouped by JVML_STOCK_FIELD_GROUPS, and a
 * footer with ingestion provenance + Close. Presentational only — no API calls.
 *
 * Layout is config-driven (jvml-stock-fields.ts) via a generic FieldCell, so
 * every stored field renders without a hard-coded list. <250 lines.
 */

import { format, parseISO } from "date-fns"
import { Boxes, CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { JVML_STOCK_FIELD_GROUPS } from "./jvml-stock-fields"
import type { FieldDef } from "./jvml-stock-fields"
import type { JvmlStock } from "@/types/jvml-stock/stock"
import type { ViewJvmlStockDialogProps } from "@/types/jvml-stock/stock-ui"

// ── value formatting ─────────────────────────────────────────────────────────

const EMPTY = "—"
const NCO_NEGATIVE = new Set(["", "no", "n", "-", "0", "none", "nil", "false"])

function fmtDate(v: string): string {
  try { return format(parseISO(v), "dd MMM yyyy") } catch { return v }
}
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return EMPTY
  try { return format(parseISO(v), "dd MMM yyyy, HH:mm") } catch { return v }
}
function isDeclared(v: unknown): boolean {
  return typeof v === "string" && !NCO_NEGATIVE.has(v.trim().toLowerCase())
}

// ── field cell (label over value) ────────────────────────────────────────────

function FieldCell({ def, row }: { def: FieldDef; row: JvmlStock }) {
  const raw = row[def.key]
  const empty = raw === null || raw === undefined || raw === ""
  let value: React.ReactNode = EMPTY

  if (!empty) {
    switch (def.kind) {
      case "date":
        value = fmtDate(String(raw))
        break
      case "datetime":
        value = fmtDateTime(String(raw))
        break
      case "mono":
        value = <span className="font-mono text-xs select-all">{String(raw)}</span>
        break
      case "number": {
        const n = Number(raw)
        value = (
          <span className="tabular-nums">
            {Number.isFinite(n) ? n.toLocaleString() : String(raw)}
          </span>
        )
        break
      }
      default:
        value = String(raw)
    }
  }

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {def.label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm text-foreground [overflow-wrap:anywhere]",
          empty && "text-muted-foreground/40",
        )}
        title={empty ? undefined : String(raw)}
      >
        {value}
      </dd>
    </div>
  )
}

// ── section header (label + trailing hairline) ───────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {title}
      </h3>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────

export function ViewJvmlStockDialog({
  open,
  onOpenChange,
  row,
}: ViewJvmlStockDialogProps) {
  const title = row?.customer_name || row?.customer || "JVML stock record"
  const subtitle = row
    ? [row.party_code, row.material].filter(Boolean).join(" · ") || "Stock detail"
    : "No record selected"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Header */}
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
            >
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg leading-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-xs">
                {subtitle}
              </DialogDescription>

              {row && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {row.report_date && (
                    <Badge variant="secondary" className="gap-1">
                      <CalendarDays /> {row.report_date}
                    </Badge>
                  )}
                  {row.jsw_grade && (
                    <Badge variant="outline">Grade {row.jsw_grade}</Badge>
                  )}
                  {row.stock_quantity != null && String(row.stock_quantity) !== "" && (
                    <Badge variant="outline" className="tabular-nums">
                      {Number(row.stock_quantity).toLocaleString()} MT
                    </Badge>
                  )}
                  {isDeclared(row.nco_declared) && (
                    <Badge variant="destructive">NCO: {String(row.nco_declared)}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {row ? (
            <div className="space-y-7">
              {JVML_STOCK_FIELD_GROUPS.map((group) => (
                <section key={group.group}>
                  <SectionHeader title={group.group} />
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    {group.fields.map((def) => (
                      <FieldCell key={String(def.key)} def={def} row={row} />
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No stock record selected.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-6 py-3">
          <p className="min-w-0 truncate text-[11px] text-muted-foreground">
            {row?.created_at
              ? `Ingested ${fmtDateTime(row.created_at)}`
              : "JVML current-stock report"}
          </p>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
