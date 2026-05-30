import * as React from "react"
import { CheckIcon, ChevronsUpDown, XIcon, Loader2Icon } from "lucide-react"

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
import { useAsyncOptions } from "@/components/common/hooks/useAsyncOptions"
import type { AsyncOption } from "@/types/admin/options"

export interface AsyncComboboxProps {
  /** Currently selected value (the `AsyncOption.value`), or `null` for none. */
  value: string | null
  /** Called with the new value and the full option object when selection changes. */
  onChange: (value: string | null, option?: AsyncOption) => void
  /** Async function that fetches options from the backend for a given query. */
  fetchOptions: (q: string) => Promise<AsyncOption[]>
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  /** Whether a clear (×) button is shown when a value is selected. */
  allowClear?: boolean
  className?: string
  /** Accessible label forwarded to the trigger button via aria-label. */
  "aria-label"?: string
}

/**
 * Backend-driven async search-select.
 *
 * Delegates all filtering to the server — options are fetched on each
 * keystroke (debounced 300ms via `useAsyncOptions`). The backend caps results
 * at ≤200 items. No client-side filtering is applied.
 *
 * Built on shadcn `Popover` + `Command` primitives.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.6
 * `components/common/AsyncCombobox.tsx`
 */
export function AsyncCombobox({
  value,
  onChange,
  fetchOptions,
  placeholder = "Select…",
  emptyText = "No results found.",
  disabled = false,
  allowClear = false,
  className,
  "aria-label": ariaLabel,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { query, setQuery, options, loading, error } = useAsyncOptions(fetchOptions)

  const selected = options.find((o) => o.value === value) ?? null

  function handleSelect(opt: AsyncOption) {
    onChange(opt.value === value ? null : opt.value, opt)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between gap-2 px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {allowClear && value && (
              <span
                role="button"
                aria-label="Clear selection"
                onClick={handleClear}
                className="rounded p-0.5 opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onChange(null)
                  }
                }}
              >
                <XIcon className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div
                aria-live="polite"
                aria-label="Loading options"
                className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
              >
                <Loader2Icon className="size-4 animate-spin" />
                Loading…
              </div>
            )}

            {!loading && error && (
              <div
                aria-live="assertive"
                className="px-3 py-4 text-center text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {!loading && !error && options.length === 0 && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}

            {!loading && !error && options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt)}
                    data-checked={value === opt.value}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm leading-none">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-xs text-muted-foreground">
                          {opt.sublabel}
                        </span>
                      )}
                    </span>
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
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
