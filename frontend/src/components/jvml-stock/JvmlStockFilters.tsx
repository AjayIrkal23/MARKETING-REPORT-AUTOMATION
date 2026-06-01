import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchJvmlStockFieldOptions } from "@/api/jvml-stock/options"
import type { JvmlStockField } from "@/types/jvml-stock/stock"
import type { JvmlStockFiltersProps } from "@/types/jvml-stock/stock-ui"

// ── Field config ─────────────────────────────────────────────────────────────

interface FieldFilterConfig {
  field: JvmlStockField
  label: string
  placeholder: string
}

const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "party_code",       label: "Party Code",    placeholder: "Any party code…"   },
  { field: "sales_order_type", label: "Order Type",   placeholder: "Any order type…"   },
  { field: "customer_name",    label: "Customer",      placeholder: "Any customer…"     },
  { field: "sales_office",     label: "Sales Office",  placeholder: "Any sales office…" },
  { field: "nco_declared",     label: "NCO",           placeholder: "Any NCO value…"    },
]

// ── FETCHERS — frozen at module level (referential stability rule) ────────────
// Defining these inside the component would cause a new function reference on
// every render, triggering useAsyncOptions to re-fetch spuriously.

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchJvmlStockFieldOptions(field)]),
) as Record<JvmlStockField, (q: string) => Promise<{ value: string; label: string }[]>>

// ── Active count helper ───────────────────────────────────────────────────────

function countActive(props: JvmlStockFiltersProps): number {
  return FIELD_FILTERS.filter(({ field }) => !!props[field]).length
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Inline per-field filter group for the JVML Stock List toolbar — the 5
 * async-select field filters (Party Code, Order Type, Customer, Sales Office,
 * NCO), rendered as a flat fragment that flows into the toolbar's wrapping flex row.
 * A trailing "Clear" button appears whenever any field is active.
 *
 * FETCHERS are frozen at module level for referential stability across renders.
 */
export function JvmlStockFilters(props: JvmlStockFiltersProps) {
  const { onFilterChange, onClearAll } = props
  const activeCount = countActive(props)

  return (
    <>
      {FIELD_FILTERS.map(({ field, label, placeholder }) => (
        <div key={field} className="min-w-[150px] flex-[1_1_150px]">
          <AsyncCombobox
            value={props[field] || null}
            onChange={(value) =>
              onFilterChange({
                [field]: value ?? "",
              } as Partial<Pick<JvmlStockFiltersProps, JvmlStockField>>)
            }
            fetchOptions={FETCHERS[field]}
            placeholder={placeholder}
            emptyText={`No ${label.toLowerCase()} options.`}
            allowClear
            aria-label={`Filter by ${label}`}
          />
        </div>
      ))}

      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-9 shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label={`Clear all filters, ${activeCount} active`}
        >
          <XIcon className="size-3.5" />
          Clear ({activeCount})
        </Button>
      )}
    </>
  )
}
