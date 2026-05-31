/**
 * DateRangePicker — shadcn date-range filter (Popover + range Calendar).
 *
 * Emits inclusive ISO-8601 bounds: `from` snapped to start-of-day and `to`
 * snapped to end-of-day, so a single-day selection still matches that whole
 * day against the backend's inclusive `$gte`/`$lte` timestamp predicate.
 * Stateless w.r.t. the query — the parent owns `from`/`to`.
 */

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangePickerProps {
  /** ISO-8601 inclusive lower bound, or `null`. */
  from: string | null
  /** ISO-8601 inclusive upper bound, or `null`. */
  to: string | null
  onChange: (range: { from: string | null; to: string | null }) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}

function startOfDayIso(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function endOfDayIso(d: Date): string {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Date range",
  className,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected: DateRange | undefined = from
    ? { from: new Date(from), to: to ? new Date(to) : undefined }
    : undefined

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? startOfDayIso(range.from) : null,
      to: range?.to ? endOfDayIso(range.to) : null,
    })
  }

  function clear() {
    onChange({ from: null, to: null })
  }

  const label =
    from && to
      ? `${format(new Date(from), "MMM d, yyyy")} – ${format(new Date(to), "MMM d, yyyy")}`
      : from
        ? `From ${format(new Date(from), "MMM d, yyyy")}`
        : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "h-9 justify-start gap-2 px-3 font-normal",
            !from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
          {from && (
            <span
              role="button"
              aria-label="Clear date range"
              onClick={(e) => {
                e.stopPropagation()
                clear()
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  clear()
                }
              }}
              className="ml-auto rounded p-0.5 opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XIcon className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={from ? new Date(from) : undefined}
          selected={selected}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
