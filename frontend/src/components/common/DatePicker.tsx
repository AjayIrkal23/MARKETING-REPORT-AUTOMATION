/**
 * DatePicker — shadcn single-date filter (Popover + single Calendar).
 *
 * Emits the selected day as a "dd-MM-yyyy" string (matches the backend
 * report_date format) or null when cleared. Stateless w.r.t. the query —
 * the parent owns `value`.
 */

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import { format, parse } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const WIRE_FORMAT = "dd-MM-yyyy"

export interface DatePickerProps {
  /** Selected day as a "dd-MM-yyyy" string, or `null`. */
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}

function parseWire(value: string | null): Date | undefined {
  if (!value) return undefined
  const d = parse(value, WIRE_FORMAT, new Date())
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseWire(value)

  function handleSelect(day: Date | undefined) {
    onChange(day ? format(day, WIRE_FORMAT) : null)
    setOpen(false)
  }

  function clear() {
    onChange(null)
  }

  const label = selected ? format(selected, "MMM d, yyyy") : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "h-9 justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
          {selected && (
            <span
              role="button"
              aria-label="Clear date"
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
          mode="single"
          defaultMonth={selected}
          selected={selected}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
