import * as React from "react"
import { CheckIcon, ChevronsUpDown, Loader2Icon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAsyncOptions } from "@/components/common/hooks/useAsyncOptions"
import type { AsyncOption } from "@/types/admin/options"

export interface MultiSelectAsyncComboboxProps {
  values: string[]
  onChange: (values: string[]) => void
  fetchOptions: (q: string) => Promise<AsyncOption[]>
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

export function MultiSelectAsyncCombobox({
  values,
  onChange,
  fetchOptions,
  placeholder = "Select…",
  emptyText = "No results found.",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: MultiSelectAsyncComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const { query, setQuery, options, loading, error } = useAsyncOptions(fetchOptions)

  const selectedMap = React.useMemo(() => {
    const map = new Map<string, AsyncOption>()
    for (const opt of options) {
      if (values.includes(opt.value)) {
        map.set(opt.value, opt)
      }
    }
    // Preserve labels for selected values even if not in current options list.
    for (const v of values) {
      if (!map.has(v)) {
        map.set(v, { value: v, label: v })
      }
    }
    return map
  }, [options, values])

  function toggleValue(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  function removeValue(value: string) {
    onChange(values.filter((v) => v !== value))
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
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
            "h-auto min-h-9 w-full justify-between gap-2 px-2 py-1.5 font-normal",
            values.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1 overflow-hidden">
            {values.length === 0 ? (
              <span className="px-1">{placeholder}</span>
            ) : (
              values.map((v) => {
                const opt = selectedMap.get(v)
                return (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-normal"
                  >
                    {opt?.label ?? v}
                    <span
                      role="button"
                      aria-label={`Remove ${opt?.label ?? v}`}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeValue(v)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          removeValue(v)
                        }
                      }}
                      className="rounded p-0.5 opacity-60 hover:opacity-100"
                    >
                      <XIcon className="size-3" />
                    </span>
                  </Badge>
                )
              })
            )}
          </div>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {values.length > 0 && (
              <span
                role="button"
                aria-label="Clear all"
                tabIndex={0}
                onClick={clearAll}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onChange([])
                  }
                }}
                className="rounded p-0.5 opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                {options.map((opt) => {
                  const selected = values.includes(opt.value)
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => toggleValue(opt.value)}
                      data-checked={selected}
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
                          selected ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
