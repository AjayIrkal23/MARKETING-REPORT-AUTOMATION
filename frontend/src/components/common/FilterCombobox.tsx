/**
 * FilterCombobox — searchable single-select for bounded filter facets.
 *
 * A consistent search-and-select replacement for plain `<Select>` filters,
 * visually matching `AsyncCombobox`. Renders an "All" reset item followed by
 * the provided options, locally searchable via the shadcn `Command` primitive.
 *
 * Options are supplied by the parent (sourced from backend `/facets`) — this
 * component performs no fetching and no client-side filtering of server data;
 * its local search merely narrows an already-server-provided option list.
 */

import * as React from "react"
import { CheckIcon, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface FilterComboboxOption {
  value: string
  label: string
}

export interface FilterComboboxProps {
  /** Currently selected value, or `null` for the "all" reset state. */
  value: string | null
  /** Called with the new value, or `null` when the "all" item is chosen. */
  onChange: (value: string | null) => void
  /** Selectable options (the "all" item is rendered separately). */
  options: FilterComboboxOption[]
  /** Label for the reset item and the trigger when nothing is selected. */
  allLabel: string
  searchPlaceholder?: string
  emptyText?: string
  /** Applied to the trigger button (width, etc.). */
  className?: string
  "aria-label"?: string
}

export function FilterCombobox({
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  className,
  "aria-label": ariaLabel,
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value) ?? null

  function select(next: string | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? allLabel}
          className={cn(
            "h-9 justify-between gap-2 px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : allLabel}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem value={allLabel} onSelect={() => select(null)}>
                <span className="text-sm leading-none">{allLabel}</span>
                <CheckIcon
                  className={cn(
                    "ml-auto size-4 shrink-0",
                    value === null ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  keywords={[opt.value]}
                  onSelect={() => select(opt.value)}
                  data-checked={value === opt.value}
                >
                  <span className="text-sm leading-none">{opt.label}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
