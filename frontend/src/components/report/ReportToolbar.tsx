/**
 * ReportToolbar — the Report JSW/JVML input row.
 *
 * Date (DatePicker) · report type (JSW/JVML segmented) · region (optional
 * AsyncCombobox; empty ⇒ all regions) · days (aging) Select · Generate button ·
 * Export button.
 * Purely presentational — all state lives in `useReport`.
 */

import { Columns3, DownloadIcon, Loader2Icon, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DatePicker } from "@/components/common/DatePicker"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchRegionOptions } from "@/api/admin/regions/options"
import { cn } from "@/lib/utils"
import type { DaysFilter, ReportTypeSelection } from "@/types/report/report"
import {
  REPORT_OPTIONAL_COLS,
  type ReportColKey,
  type ReportColVisibility,
} from "./report-format"
import type { ReportInputs } from "./hooks/useReport"

const DAYS_OPTIONS: { value: DaysFilter; label: string }[] = [
  { value: "include", label: "All stock" },
  { value: "exclude", label: "Normal + QA-hold < 2 days" },
  { value: "only", label: "Only QA-hold > 2 days" },
]

const REPORT_TYPES: { value: ReportTypeSelection; label: string }[] = [
  { value: "jsw", label: "JSW" },
  { value: "jvml", label: "JVML" },
  { value: "both", label: "Both" },
]

export interface ReportToolbarProps {
  inputs: ReportInputs
  loading: boolean
  exporting: boolean
  canGenerate: boolean
  visibleCols: ReportColVisibility
  onToggleCol: (key: ReportColKey) => void
  onDate: (d: string | null) => void
  onReportType: (t: ReportTypeSelection) => void
  onRegion: (id: string | null) => void
  onDays: (d: DaysFilter) => void
  onGenerate: () => void
  onExport: () => void
}

export function ReportToolbar({
  inputs, loading, exporting, canGenerate, visibleCols, onToggleCol,
  onDate, onReportType, onRegion, onDays, onGenerate, onExport,
}: ReportToolbarProps) {
  const busy = loading || exporting
  const shownCount = REPORT_OPTIONAL_COLS.filter((c) => visibleCols[c.key]).length

  return (
    <div
      role="toolbar"
      aria-label="Report filters"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-xs"
    >
      {/* Date */}
      <DatePicker
        value={inputs.date}
        onChange={onDate}
        placeholder="Report date"
        disabled={busy}
        aria-label="Report date"
        className="h-9 shrink-0"
      />

      {/* Report type — segmented JSW / JVML / Both */}
      <div
        className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-muted/50 p-1"
        role="group"
        aria-label="Report type"
      >
        {REPORT_TYPES.map((t) => {
          const active = inputs.report_type === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onReportType(t.value)}
              disabled={busy}
              aria-pressed={active}
              className={cn(
                "rounded-md px-3.5 py-1 text-sm font-medium transition-colors disabled:opacity-50",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Region (optional) — grows to fill, pushing the actions to the right edge */}
      <div className="min-w-[180px] flex-[1_1_200px]">
        <AsyncCombobox
          value={inputs.region_id}
          onChange={(v) => onRegion(v)}
          fetchOptions={searchRegionOptions}
          placeholder="All regions"
          emptyText="No regions."
          disabled={busy}
          allowClear
          aria-label="Filter by region"
        />
      </div>

      {/* Columns — toggle optional trailing columns (checkboxes) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" disabled={busy}>
            <Columns3 className="size-4" />
            Columns
            <span className="text-muted-foreground">({shownCount}/{REPORT_OPTIONAL_COLS.length})</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Detail columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {REPORT_OPTIONAL_COLS.filter((c) => c.side === "detail").map((c) => (
            <DropdownMenuCheckboxItem
              key={c.key}
              checked={visibleCols[c.key]}
              onCheckedChange={() => onToggleCol(c.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuLabel>RAKE columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {REPORT_OPTIONAL_COLS.filter((c) => c.side === "rake").map((c) => (
            <DropdownMenuCheckboxItem
              key={c.key}
              checked={visibleCols[c.key]}
              onCheckedChange={() => onToggleCol(c.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuLabel>Credit columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {REPORT_OPTIONAL_COLS.filter((c) => c.side === "credit").map((c) => (
            <DropdownMenuCheckboxItem
              key={c.key}
              checked={visibleCols[c.key]}
              onCheckedChange={() => onToggleCol(c.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Days (aging) */}
      <Select value={inputs.days} onValueChange={(v) => onDays(v as DaysFilter)} disabled={busy}>
        <SelectTrigger className="h-9 w-[210px] shrink-0" aria-label="QA-hold aging day filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAYS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Actions — hairline divider, then Generate (primary) + Export (secondary) */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-border sm:block" />

        {/* Generate */}
        <Button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="h-9 shrink-0 gap-1.5 px-4"
        >
          {loading ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {loading ? "Generating…" : "Generate"}
        </Button>

        {/* Export */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!canGenerate || busy}
          className="h-9 gap-1.5"
        >
          {exporting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <DownloadIcon className="size-4" />
          )}
          Export
        </Button>
      </div>
    </div>
  )
}
