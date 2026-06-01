/**
 * ReportToolbar — the Report JSW/JVML input row.
 *
 * Date (DatePicker) · report type (JSW/JVML segmented) · region (optional
 * AsyncCombobox; empty ⇒ all regions) · days (aging) Select · Generate button.
 * Purely presentational — all state lives in `useReport`.
 */

import { Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/common/DatePicker"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchRegionOptions } from "@/api/admin/regions/options"
import { cn } from "@/lib/utils"
import type { DaysFilter, ReportType } from "@/types/report/report"
import type { ReportInputs } from "./hooks/useReport"

const DAYS_OPTIONS: { value: DaysFilter; label: string }[] = [
  { value: "include", label: "Include 2 days" },
  { value: "exclude", label: "Exclude 2 days" },
  { value: "only", label: "Only 2 days" },
]

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "jsw", label: "JSW" },
  { value: "jvml", label: "JVML" },
]

export interface ReportToolbarProps {
  inputs: ReportInputs
  loading: boolean
  canGenerate: boolean
  onDate: (d: string | null) => void
  onReportType: (t: ReportType) => void
  onRegion: (id: string | null) => void
  onDays: (d: DaysFilter) => void
  onGenerate: () => void
}

export function ReportToolbar({
  inputs, loading, canGenerate,
  onDate, onReportType, onRegion, onDays, onGenerate,
}: ReportToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Report filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Date */}
      <DatePicker
        value={inputs.date}
        onChange={onDate}
        placeholder="Report date"
        aria-label="Report date"
        className="shrink-0"
      />

      {/* Report type — segmented JSW / JVML */}
      <div className="inline-flex shrink-0 rounded-md border border-input p-0.5" role="group" aria-label="Report type">
        {REPORT_TYPES.map((t) => {
          const active = inputs.report_type === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onReportType(t.value)}
              aria-pressed={active}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Region (optional) */}
      <div className="min-w-[180px] flex-[1_1_180px]">
        <AsyncCombobox
          value={inputs.region_id}
          onChange={(v) => onRegion(v)}
          fetchOptions={searchRegionOptions}
          placeholder="All regions"
          emptyText="No regions."
          allowClear
          aria-label="Filter by region"
        />
      </div>

      {/* Days (aging) */}
      <Select value={inputs.days} onValueChange={(v) => onDays(v as DaysFilter)}>
        <SelectTrigger className="w-[150px] shrink-0" aria-label="Aging day filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAYS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Generate */}
      <Button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || loading}
        className="shrink-0 gap-1.5"
      >
        <Play className={loading ? "size-3.5 animate-pulse" : "size-3.5"} />
        {loading ? "Generating…" : "Generate"}
      </Button>
    </div>
  )
}
