import { useState } from "react"
import { format, parseISO } from "date-fns"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DateRangePicker } from "@/components/common/DateRangePicker"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { MultiSelectAsyncCombobox } from "@/components/common/MultiSelectAsyncCombobox"
import { searchRegionOptions } from "@/api/admin/regions/options"
import { searchAnalyticsFieldOptions } from "@/api/analytics/dashboard"
import type {
  AnalyticsField,
  AnalyticsFiltersState,
  DaysFilter,
  ReportType,
} from "@/types/analytics/dashboard"

interface AnalyticsFiltersProps {
  fromDate: string
  toDate: string
  filters: AnalyticsFiltersState
  onDateChange: (fromDate: string, toDate: string) => void
  onFilterChange: <K extends keyof AnalyticsFiltersState>(
    key: K,
    value: AnalyticsFiltersState[K],
  ) => void
  onReset: () => void
}

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "both", label: "JSW + JVML" },
  { value: "jsw", label: "JSW" },
  { value: "jvml", label: "JVML" },
]

const DAYS_OPTIONS: { value: DaysFilter; label: string }[] = [
  { value: "include", label: "All stock" },
  { value: "exclude", label: "Exclude aged QA-hold" },
  { value: "only", label: "Only aged QA-hold" },
]

const DIMENSION_FILTERS: {
  key: AnalyticsField
  label: string
  placeholder: string
}[] = [
  { key: "distr_chnl", label: "Channel", placeholder: "Any channel…" },
  { key: "sales_office", label: "Sales office", placeholder: "Any office…" },
  { key: "customer_name", label: "Customer", placeholder: "Any customer…" },
  { key: "segment", label: "Segment", placeholder: "Any segment…" },
  { key: "transport_mode", label: "Transport", placeholder: "Any transport…" },
  { key: "rake", label: "RAKE", placeholder: "Any RAKE…" },
  { key: "route", label: "Route", placeholder: "Any route…" },
]

const WIRE_FORMAT = "dd-MM-yyyy"

function toIso(date: string): string {
  const [d, m, y] = date.split("-")
  return `${y}-${m}-${d}T00:00:00.000Z`
}

function fromIso(iso: string | null): string {
  if (!iso) return ""
  return format(parseISO(iso), WIRE_FORMAT)
}

export function AnalyticsFilters({
  fromDate,
  toDate,
  filters,
  onDateChange,
  onFilterChange,
  onReset,
}: AnalyticsFiltersProps) {
  const [open, setOpen] = useState(false)

  const activeFiltersCount =
    filters.distr_chnl.length +
    filters.sales_office.length +
    filters.customer_name.length +
    filters.segment.length +
    filters.transport_mode.length +
    filters.rake.length +
    filters.route.length

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      {/* Always-visible top row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Date range</Label>
          <DateRangePicker
            from={fromDate ? toIso(fromDate) : null}
            to={toDate ? toIso(toDate) : null}
            onChange={(range) =>
              onDateChange(fromIso(range.from), fromIso(range.to))
            }
            placeholder="Select date range"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Report</Label>
          <Select
            value={filters.reportType}
            onValueChange={(v) => onFilterChange("reportType", v as ReportType)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Region</Label>
          <AsyncCombobox
            value={filters.region || null}
            onChange={(v) => onFilterChange("region", v ?? "")}
            fetchOptions={searchRegionOptions}
            placeholder="All regions"
            allowClear
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">QA-hold filter</Label>
          <Select
            value={filters.days}
            onValueChange={(v) => onFilterChange("days", v as DaysFilter)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collapsible dimension filters */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2">
              <SlidersHorizontal className="size-3.5" />
              <span>More filters</span>
              {activeFiltersCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>

          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIMENSION_FILTERS.map((dim) => (
              <div key={dim.key} className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">{dim.label}</Label>
                <MultiSelectAsyncCombobox
                  values={filters[dim.key]}
                  onChange={(v) => onFilterChange(dim.key, v)}
                  fetchOptions={searchAnalyticsFieldOptions(
                    dim.key,
                    filters.reportType,
                    fromDate,
                    toDate,
                    filters.region || undefined,
                  )}
                  placeholder={dim.placeholder}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
