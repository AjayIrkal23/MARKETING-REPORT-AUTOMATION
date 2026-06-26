/**
 * ExportSheetsDialog — pick which sheets the combined /report .xlsx export includes.
 *
 * Opened by the toolbar's Export button. Each option is a checkbox row with an
 * icon. JSW / JVML options are shown only when the report type includes them
 * (jsw → JSW only, jvml → JVML only, both → both). Defaults to all visible
 * options selected; confirms the selection (in canonical sheet order) to the hook.
 *
 * The selectable body is keyed on `reportType:open` so its initial "all selected"
 * state is re-seeded every time the dialog opens (no effect / setState-in-effect).
 */

import { useState } from "react"
import {
  Boxes, Combine, CreditCard, DownloadIcon, LayoutGrid, Loader2Icon,
  Rows3, TrainTrack, type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { ExportSheetKey, ReportTypeSelection } from "@/types/report/report"

interface SheetOption {
  key: ExportSheetKey
  label: string
  desc: string
  Icon: LucideIcon
}

// Canonical order — also the sheet order inside the workbook.
const SHEET_OPTIONS: SheetOption[] = [
  { key: "pivot", label: "Branch Wise Pivot Report", desc: "Grouped coil-stock pivot", Icon: LayoutGrid },
  { key: "rake_totals", label: "Total Rake Report", desc: "RAKE totals + grand total", Icon: TrainTrack },
  { key: "rake_merged", label: "Rake Breakdown — Merged", desc: "One sheet per rake (merged rows)", Icon: Combine },
  { key: "rake_unmerged", label: "Rake Breakdown — Unmerged", desc: "One sheet per rake (raw rows)", Icon: Rows3 },
  { key: "jsw", label: "JSW Stock List", desc: "Full JSW current-stock export", Icon: Boxes },
  { key: "jvml", label: "JVML Stock List", desc: "Full JVML current-stock export", Icon: Boxes },
  { key: "credit", label: "Credit Report", desc: "Credit-control export", Icon: CreditCard },
]

function visibleOptions(reportType: ReportTypeSelection): SheetOption[] {
  return SHEET_OPTIONS.filter((o) => {
    if (o.key === "jsw") return reportType === "jsw" || reportType === "both"
    if (o.key === "jvml") return reportType === "jvml" || reportType === "both"
    return true
  })
}

export interface ExportSheetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportType: ReportTypeSelection
  exporting: boolean
  onConfirm: (sheets: ExportSheetKey[]) => void
}

export function ExportSheetsDialog({
  open, onOpenChange, reportType, exporting, onConfirm,
}: ExportSheetsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose export sheets</DialogTitle>
          <DialogDescription>
            Pick the sheets to include in one Excel file. All are selected by default.
          </DialogDescription>
        </DialogHeader>
        {/* key re-seeds the "all selected" state every open / report-type change */}
        <ExportSheetsBody
          key={`${reportType}:${open}`}
          reportType={reportType}
          exporting={exporting}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  )
}

function ExportSheetsBody({
  reportType, exporting, onConfirm,
}: Omit<ExportSheetsDialogProps, "open" | "onOpenChange">) {
  const options = visibleOptions(reportType)
  const [selected, setSelected] = useState<Set<ExportSheetKey>>(
    () => new Set(options.map((o) => o.key)),
  )

  const toggle = (key: ExportSheetKey) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const allChecked = options.length > 0 && options.every((o) => selected.has(o.key))
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(options.map((o) => o.key)))

  const handleExport = () => {
    const sheets = SHEET_OPTIONS.filter((o) => selected.has(o.key)).map((o) => o.key)
    if (sheets.length > 0) onConfirm(sheets)
  }

  return (
    <>
      <div className="-mx-1 max-h-[55vh] space-y-1.5 overflow-y-auto px-1 py-1">
        {options.map(({ key, label, desc, Icon }) => {
          const checked = selected.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={checked}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                  checked
                    ? "bg-primary/10 text-primary ring-primary/20"
                    : "bg-muted text-muted-foreground ring-border",
                )}
              >
                <Icon className="size-[1.05rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{desc}</span>
              </span>
              <Checkbox checked={checked} tabIndex={-1} aria-hidden className="pointer-events-none" />
            </button>
          )
        })}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={toggleAll} className="h-9">
          {allChecked ? "Clear all" : "Select all"}
        </Button>
        <Button
          type="button"
          onClick={handleExport}
          disabled={selected.size === 0 || exporting}
          className="h-9 gap-1.5"
        >
          {exporting ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
          Export {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </DialogFooter>
    </>
  )
}
