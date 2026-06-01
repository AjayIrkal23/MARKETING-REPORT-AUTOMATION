# FE Toolbar + Filters — Builder Packet (JvmlStock)

> READ-ONLY research. Files the builder must CREATE (never edit jsw-stock files).
> All paths relative to `frontend/src/`.

---

## 1. Confirmed Component Signatures

### AsyncCombobox (`components/common/AsyncCombobox.tsx`)

```ts
export interface AsyncComboboxProps {
  value: string | null                                         // selected AsyncOption.value or null
  onChange: (value: string | null, option?: AsyncOption) => void
  fetchOptions: (q: string) => Promise<AsyncOption[]>         // backend-driven; stable ref REQUIRED
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  allowClear?: boolean                                         // shows × when value is non-null
  className?: string
  "aria-label"?: string
}
```

**Critical:** `fetchOptions` must be a stable reference (frozen at module level or via `useMemo([])`).
If the reference changes on every render, `useAsyncOptions` re-fires the search each keystroke cycle.

### DateRangePicker (`components/common/DateRangePicker.tsx`)

```ts
export interface DateRangePickerProps {
  from: string | null        // ISO-8601 lower bound (start-of-day) or null
  to: string | null          // ISO-8601 upper bound (end-of-day) or null
  onChange: (range: { from: string | null; to: string | null }) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}
```

**Behavior:** emits `from` snapped to `00:00:00.000` and `to` snapped to `23:59:59.999`.
A single-day pick sets both `from` AND `to` to that day's bounds — matches backend `$gte`/`$lte`.
Clearing sends `{ from: null, to: null }`.

**SPEC mapping:** `dateFrom` / `dateTo` are the query state keys (ISO strings sent to backend).
Wire: `from={query.dateFrom ?? null}` `to={query.dateTo ?? null}`
`onChange={({ from, to }) => onQueryChange({ dateFrom: from ?? undefined, dateTo: to ?? undefined, page: 1 })}`.

### FilterCombobox (`components/common/FilterCombobox.tsx`)

```ts
export interface FilterComboboxProps {
  value: string | null
  onChange: (value: string | null) => void
  options: { value: string; label: string }[]   // static/pre-fetched list (NOT backend async)
  allLabel: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  "aria-label"?: string
}
```

**Note:** FilterCombobox is for bounded static option lists (e.g. category, outcome). The JVML Stock
filters are all backend-driven async — use `AsyncCombobox` for ALL 10 per-field filters.
FilterCombobox is NOT used in `JvmlStockFilters`.

### AsyncOption type (`types/admin/options.ts`)

```ts
// Import path used throughout:
import type { AsyncOption } from "@/types/admin/options"
// Shape (from usage in AsyncCombobox + useAsyncOptions):
interface AsyncOption {
  value: string
  label: string
  sublabel?: string
}
```

---

## 2. Options API Pattern (`api/admin/customer-codes/options.ts` reference)

```ts
// Pattern to replicate at src/api/jvml-stock/options.ts:
import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type { JvmlStockField } from "@/types/jvml-stock/stock"

export function searchJvmlStockFieldOptions(
  field: JvmlStockField,
): (q: string) => Promise<AsyncOption[]> {
  return (q: string) =>
    getData<AsyncOption[]>(
      `/jvml-stock/options${buildQuery({ field, q, limit: 20 })}`,
    )
}
```

**Backend endpoint:** `GET /jvml-stock/options?field=<JvmlStockField>&q=<str>&limit=20`
(NOT `/admin/jvml-stock/options` — list + options are non-admin routes per SPEC §2).

---

## 3. FETCHERS Pattern (module-level freeze — CRITICAL)

```ts
// At module level in JvmlStockFilters.tsx — NEVER inside the component body:
const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "so_sales_org",      label: "SO Sales Org",      placeholder: "Any SO sales org…"     },
  { field: "sales_order_type",  label: "Sales Order Type",  placeholder: "Any order type…"       },
  { field: "distr_chnl",        label: "Distr. Channel",    placeholder: "Any channel…"          },
  { field: "sold_to_party",     label: "Sold To Party",     placeholder: "Any sold-to party…"    },
  { field: "customer",          label: "Customer",          placeholder: "Any customer…"         },
  { field: "material",          label: "Material",          placeholder: "Any material…"         },
  { field: "sales_office",      label: "Sales Office",      placeholder: "Any sales office…"     },
  { field: "so_product_form",   label: "SO Product Form",   placeholder: "Any product form…"     },
  { field: "jsw_grade",         label: "JSW Grade",         placeholder: "Any grade…"            },
  { field: "nco_declared",      label: "NCO Declared",      placeholder: "Any NCO declared…"     },
]

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchJvmlStockFieldOptions(field)]),
) as Record<JvmlStockField, (q: string) => Promise<AsyncOption[]>>
```

---

## 4. Ready-to-paste: `JvmlStockTableToolbar.tsx`

File: `src/components/jvml-stock/JvmlStockTableToolbar.tsx`

```tsx
/**
 * Toolbar for the JVML Stock List table.
 *
 * Left side: free-text search AsyncCombobox (on `customer` field — sets `q`) +
 *            DateRangePicker (dateFrom/dateTo — filters by createdAt) +
 *            JvmlStockFilters popover trigger (active-count badge).
 *
 * All filters are server-driven. No client-side filtering.
 * Filter state is owned by the parent hook (useJvmlStockList).
 */

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { DateRangePicker } from "@/components/common/DateRangePicker"
import { JvmlStockFilters } from "./JvmlStockFilters"
import { searchJvmlStockFieldOptions } from "@/api/jvml-stock/options"
import type { JvmlStockTableToolbarProps } from "@/types/jvml-stock/stock-ui"

// Stable search fetcher — frozen at module level (referential stability).
const fetchCustomerOptions = searchJvmlStockFieldOptions("customer")

export function JvmlStockTableToolbar({
  query,
  onQueryChange,
}: JvmlStockTableToolbarProps) {
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  // Count active per-field filters for the badge
  const FILTER_FIELDS = [
    "so_sales_org", "sales_order_type", "distr_chnl", "sold_to_party",
    "customer", "material", "sales_office", "so_product_form",
    "jsw_grade", "nco_declared",
  ] as const
  const activeCount = FILTER_FIELDS.filter(
    (f) => !!query[f as keyof typeof query],
  ).length

  return (
    <div
      role="toolbar"
      aria-label="JVML Stock table filters"
      className="flex flex-wrap items-center gap-2"
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Free-text search via AsyncCombobox on customer field.
            Selected label becomes q — backend applies $or across all q-fields. */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={(value) => applyFilter({ q: value ?? undefined })}
            fetchOptions={fetchCustomerOptions}
            placeholder="Search JVML stock…"
            emptyText="No matches found."
            allowClear
            aria-label="Search JVML stock"
          />
        </div>

        {/* Date range filter on createdAt (dateFrom/dateTo) */}
        <DateRangePicker
          from={query.dateFrom ?? null}
          to={query.dateTo ?? null}
          onChange={({ from, to }) =>
            applyFilter({
              dateFrom: from ?? undefined,
              dateTo: to ?? undefined,
            })
          }
          placeholder="Ingestion date range"
          aria-label="Filter by ingestion date range"
          className="min-w-52"
        />

        {/* Per-field async filters — shadcn Popover with active-count badge */}
        <JvmlStockFilters
          query={query}
          onFilterChange={(patch) => applyFilter(patch)}
          onClearAll={() =>
            applyFilter({
              so_sales_org: undefined,
              sales_order_type: undefined,
              distr_chnl: undefined,
              sold_to_party: undefined,
              customer: undefined,
              material: undefined,
              sales_office: undefined,
              so_product_form: undefined,
              jsw_grade: undefined,
              nco_declared: undefined,
            })
          }
          activeCount={activeCount}
        />
      </div>
    </div>
  )
}
```

---

## 5. Ready-to-paste: `JvmlStockFilters.tsx`

File: `src/components/jvml-stock/JvmlStockFilters.tsx`

```tsx
/**
 * Per-field async filter comboboxes for the JVML Stock table — wrapped in a
 * shadcn Popover with an active-count badge on the trigger.
 *
 * 10 fields per JvmlStockField Literal (SPEC §1):
 *   so_sales_org, sales_order_type, distr_chnl, sold_to_party, customer,
 *   material, sales_office, so_product_form, jsw_grade, nco_declared.
 *
 * FETCHERS frozen at module level — referential stability for useAsyncOptions.
 */

import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchJvmlStockFieldOptions } from "@/api/jvml-stock/options"
import type { JvmlStockField, JvmlStockListQuery } from "@/types/jvml-stock/stock"

// ---------------------------------------------------------------------------
// Field config
// ---------------------------------------------------------------------------

interface FieldFilterConfig {
  field: JvmlStockField
  label: string
  placeholder: string
}

const FIELD_FILTERS: FieldFilterConfig[] = [
  { field: "so_sales_org",      label: "SO Sales Org",      placeholder: "Any SO sales org…"     },
  { field: "sales_order_type",  label: "Sales Order Type",  placeholder: "Any order type…"       },
  { field: "distr_chnl",        label: "Distr. Channel",    placeholder: "Any channel…"          },
  { field: "sold_to_party",     label: "Sold To Party",     placeholder: "Any sold-to party…"    },
  { field: "customer",          label: "Customer",          placeholder: "Any customer…"         },
  { field: "material",          label: "Material",          placeholder: "Any material…"         },
  { field: "sales_office",      label: "Sales Office",      placeholder: "Any sales office…"     },
  { field: "so_product_form",   label: "SO Product Form",   placeholder: "Any product form…"     },
  { field: "jsw_grade",         label: "JSW Grade",         placeholder: "Any grade…"            },
  { field: "nco_declared",      label: "NCO Declared",      placeholder: "Any NCO declared…"     },
]

// ---------------------------------------------------------------------------
// FETCHERS — frozen at module level (NEVER move inside the component).
// Prevents useAsyncOptions from re-fetching on every render cycle.
// ---------------------------------------------------------------------------

const FETCHERS = Object.fromEntries(
  FIELD_FILTERS.map(({ field }) => [field, searchJvmlStockFieldOptions(field)]),
) as Record<JvmlStockField, (q: string) => Promise<{ value: string; label: string }[]>>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JvmlStockFiltersProps {
  query: JvmlStockListQuery
  onFilterChange: (patch: Partial<JvmlStockListQuery>) => void
  onClearAll: () => void
  activeCount: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JvmlStockFilters({
  query,
  onFilterChange,
  onClearAll,
  activeCount,
}: JvmlStockFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 flex size-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[520px] p-4" align="end">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Filters</p>
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear all filters"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* 2-column grid — 10 filters = 5 rows */}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_FILTERS.map(({ field, label, placeholder }) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {label}
              </label>
              <AsyncCombobox
                value={(query[field as keyof JvmlStockListQuery] as string | undefined) ?? null}
                onChange={(value) =>
                  onFilterChange({ [field]: value ?? undefined } as Partial<JvmlStockListQuery>)
                }
                fetchOptions={FETCHERS[field]}
                placeholder={placeholder}
                emptyText={`No ${label.toLowerCase()} options found.`}
                allowClear
                aria-label={`Filter by ${label}`}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

---

## 6. Prop Contract Interfaces (for `types/jvml-stock/stock-ui.ts`)

```ts
import type { JvmlStockListQuery, JvmlStockSortBy } from "./stock"
import type { PaginationMeta } from "@/types/api/envelope"
import type { JvmlStock } from "./stock"

export interface JvmlStockTableToolbarProps {
  query: JvmlStockQueryState          // full query state including 10 filter keys
  onQueryChange: (patch: Partial<JvmlStockQueryState>) => void
}

export interface JvmlStockFiltersProps {
  query: JvmlStockListQuery
  onFilterChange: (patch: Partial<JvmlStockListQuery>) => void
  onClearAll: () => void
  activeCount: number
}

export interface JvmlStockTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean                  // named isLoading (NOT loading) — matches CustomerCodeTablePagination
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export interface JvmlStockTableProps {
  rows: JvmlStock[]
  loading: boolean                    // named loading (NOT isLoading) — matches CustomerCodeTable
  error: string | null
  sortBy: JvmlStockSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: JvmlStockSortBy) => void
  onView: (row: JvmlStock) => void
}
```

**CRITICAL naming asymmetry (from reference code comment + customer-code-ui.ts):**
- `JvmlStockTableProps.loading` → `boolean` (table prop = `loading`)
- `JvmlStockTablePaginationProps.isLoading` → `boolean` (pagination prop = `isLoading`)

---

## 7. Query State Shape (for `types/jvml-stock/stock-ui.ts`)

```ts
export type JvmlStockQueryState = {
  page: number
  limit: number
  sortBy: JvmlStockSortBy
  sortOrder: "asc" | "desc"
  q?: string
  // 10 per-field filters (empty string or undefined = no filter, stripped before API call)
  so_sales_org?: string
  sales_order_type?: string
  distr_chnl?: string
  sold_to_party?: string
  customer?: string
  material?: string
  sales_office?: string
  so_product_form?: string
  jsw_grade?: string
  nco_declared?: string
  // Date range (ISO-8601 strings emitted by DateRangePicker)
  dateFrom?: string
  dateTo?: string
}
```

---

## 8. SPEC Mismatches / Ambiguities Found

### MISMATCH 1 — `CustomerCodeFilters` renders INLINE, not in a Popover

The SPEC §3 states `JvmlStockFilters.tsx` is "a shadcn Popover" — CONFIRMED correct as the
intended pattern. **However**, the actual `CustomerCodeFilters` reference code renders **inline**
(as a fragment with no Popover), while the SPEC explicitly wants a Popover with active-count badge
for JVML Stock. The ready-to-paste code above implements the Popover correctly as SPEC intends.
The CustomerCodeFilters inline pattern is a different design choice — do NOT mirror it for JVML Stock.

### MISMATCH 2 — Free-text search: `Input` vs `AsyncCombobox`

SPEC §3 says the toolbar should have "free-text search (`Input` w/ debounce OR `AsyncCombobox` on
`customer` → sets `q`)". The reference `CustomerCodeTableToolbar` uses `AsyncCombobox(customer)` as
the search widget (not a plain Input). The ready-to-paste code mirrors the AsyncCombobox approach
(consistent with the reference). If a plain debounced Input is preferred instead, the builder can
swap it — the query key `q` and reset-page-to-1 behavior remain the same.

### MISMATCH 3 — `JvmlStockFilters` popover vs CustomerCodeFilters inline

`CustomerCodeFilters` is **not** wrapped in a Popover — it renders its comboboxes directly as flex
children of the toolbar. SPEC wants JVML Stock to use a Popover with a trigger button + badge.
The ready-to-paste `JvmlStockFilters` uses `shadcn Popover` as SPEC requires. Confirmed correct.

### MISMATCH 4 — `dateFrom`/`dateTo` key casing

SPEC schema field: `dateFrom: str | None`, `dateTo: str | None` (camelCase).
Backend `JvmlStockListQuery` uses camelCase (`dateFrom`, `dateTo`).
`DateRangePicker` emits `{ from, to }` — the toolbar must map: `from` → `dateFrom`, `to` → `dateTo`.
This mapping is wired correctly in the ready-to-paste toolbar above.

### NOTE — `AsyncOption` import path

```ts
import type { AsyncOption } from "@/types/admin/options"
```
This is the correct import — confirmed from `AsyncCombobox.tsx` and `useAsyncOptions.ts`. The type
lives in `src/types/admin/options.ts` (shared across admin and non-admin domains).

---

## 9. Files the Builder Must Create

| File | Role |
|------|------|
| `src/components/jvml-stock/JvmlStockTableToolbar.tsx` | Toolbar: q search + DateRangePicker + Filters trigger |
| `src/components/jvml-stock/JvmlStockFilters.tsx` | Popover with 10 AsyncCombobox filters + Clear all |
| `src/api/jvml-stock/options.ts` | Curried factory `searchJvmlStockFieldOptions(field)` |
| `src/types/jvml-stock/stock-ui.ts` | Toolbar/filters/table/pagination prop contracts + QueryState |

> The builder must also create: `JvmlStockTable.tsx`, `JvmlStockTablePagination.tsx`,
> `ViewJvmlStockSheet.tsx`, `hooks/useJvmlStockList.ts`, `src/pages/jvml-stock/index.tsx`.
> Those are outside this architect's scope — see SPEC §3 for their contracts.
