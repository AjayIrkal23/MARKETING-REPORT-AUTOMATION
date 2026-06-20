/**
 * Per-field async filter comboboxes for the Customer Code Management table.
 *
 * Renders inline (no Popover trigger) — each AsyncCombobox is a direct flex
 * child of the toolbar's wrapping row, giving one continuous row of all filters.
 *
 * Design decisions:
 * - Field → label config lives in `FIELD_FILTERS` (module-level array), keeping
 *   the render path free of conditionals.
 * - Fetchers are frozen at module level in `FETCHERS` (ADDENDUM Area 8 BLOCKER 1)
 *   to prevent referential churn that would re-trigger `useAsyncOptions` on
 *   every render.
 * - Selecting a value calls `onFilterChange({ [field]: value ?? "" })` which the
 *   parent hook (`useCustomerCodeManagement`) merges into query state and resets
 *   page to 1.
 * - "Clear all" button appears only when at least one filter is active.
 * - No client-side filtering of server data — all option lists are backend-driven.
 *
 * Contract source: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM §Area 8
 * `components/admin/customer-codes/CustomerCodeFilters.tsx`
 */

import { Button } from "@/components/ui/button"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchCustomerCodeFieldOptions } from "@/api/admin/customer-codes/options"
import type { CustomerCodeField } from "@/types/admin/customer-code"
import type { CustomerCodeFiltersProps } from "@/types/admin/customer-code-ui"

// ---------------------------------------------------------------------------
// Field config — drives the rendered combobox list declaratively.
// Add or reorder entries here; the render loop needs no changes.
// ---------------------------------------------------------------------------

interface FieldFilterConfig {
  /** Model field name — must match `CustomerCodeField` and the query state key. */
  field: CustomerCodeField
  /** Human-readable label shown above the combobox. */
  label: string
  /** Placeholder text rendered inside the combobox trigger button. */
  placeholder: string
}

const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "segment",        label: "Segment",         placeholder: "Any segment…"         },
  { field: "code",           label: "Code",            placeholder: "Any code…"            },
  { field: "customer",       label: "Customer",        placeholder: "Any customer…"        },
  { field: "destination",    label: "Destination",     placeholder: "Any destination…"     },
  { field: "cam",            label: "CAM",             placeholder: "Any CAM…"             },
  { field: "mob",            label: "MOB No.",         placeholder: "Any mobile…"          },
  { field: "ship_to_city",   label: "Ship-to City",    placeholder: "Any ship-to city…"    },
  { field: "rake",           label: "Rake",            placeholder: "Any rake…"            },
  { field: "transport_mode", label: "Transport Mode",  placeholder: "Any transport mode…"  },
]

// ---------------------------------------------------------------------------
// Fetchers — frozen at module level to guarantee referential stability.
//
// Each call to `searchCustomerCodeFieldOptions(field)` returns a new function
// reference. Defining them once here prevents `useAsyncOptions` (inside each
// AsyncCombobox) from treating every render as a new fetcher and re-fetching.
//
// ADDENDUM Area 8 BLOCKER 1 — do NOT move this inside the component.
// ---------------------------------------------------------------------------

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchCustomerCodeFieldOptions(field)]),
) as Record<CustomerCodeField, (q: string) => Promise<{ value: string; label: string }[]>>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when at least one per-field filter string is non-empty. */
function hasActiveFilters(props: CustomerCodeFiltersProps): boolean {
  return (
    !!props.segment ||
    !!props.code ||
    !!props.customer ||
    !!props.destination ||
    !!props.cam ||
    !!props.mob ||
    !!props.ship_to_city ||
    !!props.rake ||
    !!props.transport_mode
  )
}

/** Map field name → current string value from props (empty string = no filter). */
function fieldValue(props: CustomerCodeFiltersProps, field: CustomerCodeField): string {
  return (props[field as keyof CustomerCodeFiltersProps] as string | undefined) ?? ""
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * `CustomerCodeFilters` — inline per-field filter comboboxes for the Customer
 * Code table toolbar. Returns a fragment so each combobox renders as a direct
 * flex child of the toolbar's wrapping row.
 *
 * Props are defined in `types/admin/customer-code-ui.ts` (`CustomerCodeFiltersProps`).
 * Intended to be rendered by `CustomerCodeTableToolbar` next to the search combobox.
 */
export function CustomerCodeFilters(props: CustomerCodeFiltersProps) {
  const { onFilterChange, onClearAll } = props
  const active = hasActiveFilters(props)

  return (
    <>
      {FIELD_FILTERS.map(({ field, label, placeholder }) => {
        const current = fieldValue(props, field)
        return (
          <div key={field} className="min-w-40 flex-1">
            <AsyncCombobox
              value={current || null}
              onChange={(value) =>
                onFilterChange({ [field]: value ?? "" } as Parameters<typeof onFilterChange>[0])
              }
              fetchOptions={FETCHERS[field]}
              placeholder={placeholder}
              emptyText={`No ${label.toLowerCase()} options found.`}
              allowClear
              aria-label={`Filter by ${label}`}
            />
          </div>
        )
      })}
      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Clear all filters"
        >
          Clear all
        </Button>
      )}
    </>
  )
}
