/**
 * ViewCreditReportDialog — premium read-only detail modal for a Credit Report row.
 *
 * Centered Dialog: tinted header with icon chip + customer name + status badges
 * (report date, CCA, blocked, credit balance), a scrollable multi-column field grid
 * grouped by CREDIT_REPORT_FIELD_GROUPS, and a footer with ingestion provenance + Close.
 * Presentational only — no API calls. <250 lines.
 *
 * New "money" kind in FieldCell: renders INR-formatted value with sign color
 * (emerald positive / destructive negative / muted zero+null).
 */

import { format, parseISO } from "date-fns"
import { CalendarDays, CreditCard } from "lucide-react"

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
import { CREDIT_REPORT_FIELD_GROUPS } from "./credit-report-fields"
import type { FieldDef } from "./credit-report-fields"
import type { CreditReport } from "@/types/credit-report/credit-report"
import type { ViewCreditReportDialogProps } from "@/types/credit-report/credit-report-ui"

// ── value formatting ─────────────────────────────────────────────────────────

const EMPTY = "—"

function fmtDate(v: string): string {
  try { return format(parseISO(v), "dd MMM yyyy") } catch { return v }
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return EMPTY
  try { return format(parseISO(v), "dd MMM yyyy, HH:mm") } catch { return v }
}

function fmtINR(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return EMPTY
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function signClass(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "text-muted-foreground/40"
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return "text-muted-foreground"
  return n > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-destructive"
}

// ── field cell (label over value) ────────────────────────────────────────────

function FieldCell({ def, row }: { def: FieldDef; row: CreditReport }) {
  const raw = row[def.key as keyof CreditReport]
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
      case "money": {
        value = (
          <span className={cn("tabular-nums", signClass(raw as number))}>
            {fmtINR(raw as number)}
          </span>
        )
        break
      }
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

export function ViewCreditReportDialog({
  open,
  onOpenChange,
  row,
}: ViewCreditReportDialogProps) {
  const title = row?.customer_name || row?.customer || "Credit report record"
  const subtitle = row
    ? [row.credit_control_area, row.cca_description].filter(Boolean).join(" · ") ||
      "Credit detail"
    : "No record selected"

  const balanceRaw = row?.credit_balance
  const balanceBadgeClass =
    balanceRaw == null
      ? ""
      : Number(balanceRaw) > 0
        ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        : Number(balanceRaw) < 0
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : ""

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
              <CreditCard className="h-5 w-5" />
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
                      <CalendarDays className="h-3 w-3" /> {row.report_date}
                    </Badge>
                  )}
                  {row.credit_control_area && (
                    <Badge variant="outline">{row.credit_control_area}</Badge>
                  )}
                  {row.blocked === "X" && (
                    <Badge variant="destructive">Blocked</Badge>
                  )}
                  {balanceRaw != null && (
                    <Badge variant="outline" className={cn("tabular-nums", balanceBadgeClass)}>
                      {fmtINR(balanceRaw)}
                    </Badge>
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
              {CREDIT_REPORT_FIELD_GROUPS.map((group) => (
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
              No credit report record selected.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-6 py-3">
          <p className="min-w-0 truncate text-[11px] text-muted-foreground">
            {row?.created_at
              ? `Ingested ${fmtDateTime(row.created_at)}`
              : "SAP credit management report"}
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
