import { XIcon } from "lucide-react"

import type { CreditReportPlant } from "@/types/credit-report/credit-report"

import { Button } from "@/components/ui/button"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { searchRegionOptions } from "@/api/admin/regions/options"
import { searchCreditReportFieldOptions } from "@/api/credit-report/options"
import type { CreditReportField } from "@/types/credit-report/credit-report"
import type { CreditReportFiltersProps } from "@/types/credit-report/credit-report-ui"

// ── Field config ─────────────────────────────────────────────────────────────

interface FieldFilterConfig {
  field: CreditReportField
  label: string
  placeholder: string
}

const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "customer_name",   label: "Customer Name",    placeholder: "Any customer name…"    },
  { field: "city",            label: "City",             placeholder: "Any city…"             },
  { field: "customer",        label: "Customer",         placeholder: "Any customer…"         },
  { field: "cca_description", label: "CCA Description",  placeholder: "Any CCA description…"  },
]

// ── FETCHERS — frozen at module level (referential stability rule) ────────────
// Defining these inside the component would cause a new function reference on
// every render, triggering useAsyncOptions to re-fetch spuriously.

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchCreditReportFieldOptions(field)]),
) as Record<CreditReportField, (q: string) => Promise<{ value: string; label: string }[]>>

// ── Active count helper ───────────────────────────────────────────────────────

function countActive(props: CreditReportFiltersProps): number {
  const asyncActive = FIELD_FILTERS.filter(({ field }) => !!props[field]).length
  const enumActive = (props.blocked ? 1 : 0) + (props.credit_balance_sign ? 1 : 0) + (props.plant !== "all" ? 1 : 0)
  const regionActive = props.region ? 1 : 0
  return asyncActive + enumActive + regionActive
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Inline filter group for the Credit Report toolbar — 4 async-select field
 * filters (Customer Name, City, Customer, CCA Description) + 2 enum Selects
 * (Blocked status, Credit Balance sign) + plant + region, rendered as a flat
 * fragment that flows into the toolbar's wrapping flex row.
 *
 * A trailing "Clear (N)" button appears whenever any of the filters is active.
 * FETCHERS are frozen at module level for referential stability across renders.
 */
export function CreditReportFilters(props: CreditReportFiltersProps) {
  const { onFilterChange, onClearAll, disabled } = props
  const activeCount = countActive(props)

  return (
    <>
      {/* 4 async-select comboboxes */}
      {FIELD_FILTERS.map(({ field, label, placeholder }) => (
        <div key={field} className="min-w-[150px] flex-[1_1_150px]">
          <AsyncCombobox
            value={props[field] || null}
            onChange={(value) =>
              onFilterChange({ [field]: value ?? "" } as Partial<
                Pick<CreditReportFiltersProps, CreditReportField | "region">
              >)
            }
            fetchOptions={FETCHERS[field]}
            placeholder={placeholder}
            emptyText={`No ${label.toLowerCase()} options.`}
            disabled={disabled}
            allowClear
            aria-label={`Filter by ${label}`}
          />
        </div>
      ))}

      {/* Region async-select */}
      <div key="region" className="min-w-[150px] flex-[1_1_150px]">
        <AsyncCombobox
          value={props.region || null}
          onChange={(value) => onFilterChange({ region: value ?? "" })}
          fetchOptions={searchRegionOptions}
          placeholder="Any region…"
          emptyText="No regions found."
          disabled={disabled}
          allowClear
          aria-label="Filter by region"
        />
      </div>

      {/* Blocked enum Select */}
      <Select
        value={props.blocked || "all"}
        onValueChange={(v) =>
          onFilterChange({
            blocked: v === "all" ? "" : (v as "blocked" | "unblocked"),
          })
        }
        disabled={disabled}
      >
        <SelectTrigger
          className="w-[150px] shrink-0"
          aria-label="Filter by blocked status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="unblocked">Not blocked</SelectItem>
        </SelectContent>
      </Select>

      {/* Credit Balance sign enum Select */}
      <Select
        value={props.credit_balance_sign || "all"}
        onValueChange={(v) =>
          onFilterChange({
            credit_balance_sign: v === "all" ? "" : (v as "positive" | "negative"),
          })
        }
        disabled={disabled}
      >
        <SelectTrigger
          className="w-[150px] shrink-0"
          aria-label="Filter by credit balance sign"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All balances</SelectItem>
          <SelectItem value="positive">Positive</SelectItem>
          <SelectItem value="negative">Negative</SelectItem>
        </SelectContent>
      </Select>

      {/* Plant enum Select */}
      <Select
        value={props.plant}
        onValueChange={(v) =>
          onFilterChange({
            plant: v as CreditReportPlant,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger
          className="w-[180px] shrink-0"
          aria-label="Filter by plant"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plants</SelectItem>
          <SelectItem value="jsw">JSW (VJ0H + 1000)</SelectItem>
          <SelectItem value="jvml">JVML (JV0H)</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear button — shown only when at least one filter is active */}
      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          disabled={disabled}
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
