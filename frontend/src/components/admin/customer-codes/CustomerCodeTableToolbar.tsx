/**
 * Toolbar for the Customer Code Management table.
 *
 * Left side: free-text search `AsyncCombobox` (on `customer` field — sets `q`) +
 *            Region `AsyncCombobox` filter (clearable — sets `query.region`) +
 *            inline per-field `CustomerCodeFilters` comboboxes.
 * Action buttons (Import / Download template / New customer code) live in the page header.
 *
 * All filters are server-driven. No client-side filtering of server data.
 * Filter state is owned by the parent hook (`useCustomerCodeManagement`); this
 * component is purely presentational and propagates changes upward via `onQueryChange`.
 *
 * Region filter query key is "region" (NOT "region_id") — the backend schema maps
 * `query.region` → `filt["region_id"]` internally.
 * (ADDENDUM §Area 8, BLOCKER 3)
 *
 * The Filters popover open/close state is owned locally (no prop required);
 * CustomerCodeFilters receives `query` + `onQueryChange` to patch per-field filters.
 *
 * Contract source: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM.md §Area 8
 */

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { searchRegionOptions } from "@/api/admin/regions/options"
import { searchCustomerCodeFieldOptions } from "@/api/admin/customer-codes/options"
import { CustomerCodeFilters } from "./CustomerCodeFilters"
import type { CustomerCodeTableToolbarProps } from "@/types/admin/customer-code-ui"

// ---------------------------------------------------------------------------
// Stable search fetcher (frozen outside render — ADDENDUM §Area 7 BLOCKER curried factory).
// Prevents referential churn that would re-trigger useAsyncOptions on every render.
// ---------------------------------------------------------------------------

const fetchCustomerOptions = searchCustomerCodeFieldOptions("customer")

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * `CustomerCodeTableToolbar` — filter bar + action strip for the Customer Code
 * Management page.
 *
 * Props are defined in `types/admin/customer-code-ui.ts`
 * (`CustomerCodeTableToolbarProps`). The `onQueryChange` callback always
 * includes `page: 1` on filter/search changes so the table does not show an
 * out-of-range page after narrowing results.
 *
 * Search combobox behaviour:
 * - Fetches `AsyncOption[]` from the `customer` field options endpoint.
 * - The selected label becomes the `q` param so the backend applies an $or
 *   search across ALL ten text fields (not just customer).
 * - Clearing the combobox sends `q: undefined` to reset the full-text search.
 *
 * Region filter behaviour:
 * - Fetches regions via `searchRegionOptions` (reuses the Region Management
 *   backend endpoint — same shape, same API client).
 * - Stores the selected option's `value` (region _id hex) as `query.region`.
 * - Clearing sends `region: undefined` — "no filter".
 */
export function CustomerCodeTableToolbar({
  query,
  onQueryChange,
}: CustomerCodeTableToolbarProps) {
  // Wrap onQueryChange to reset page on every filter/search change.
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  return (
    <div
      role="toolbar"
      aria-label="Customer code table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* ── Left: search + filters ───────────────────────────────────── */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Server-driven free-text search via AsyncCombobox on the customer field.
            The selected option label becomes the `q` value so the backend applies
            an $or search across all ten text fields. Stable fetcher frozen at
            module level (ADDENDUM §Area 7 — curried factory referential stability). */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={(value) => applyFilter({ q: value ?? undefined })}
            fetchOptions={fetchCustomerOptions}
            placeholder="Search customer codes…"
            emptyText="No matches found."
            allowClear
            aria-label="Search customer codes"
          />
        </div>

        {/* Region filter — clearable AsyncCombobox.
            query key: "region" (NOT "region_id") — ADDENDUM §Area 8, BLOCKER 3.
            value is the region _id hex (AsyncOption.value from searchRegionOptions). */}
        <div className="min-w-44 flex-1">
          <AsyncCombobox
            value={query.region ?? null}
            onChange={(value) => applyFilter({ region: value ?? undefined })}
            fetchOptions={searchRegionOptions}
            placeholder="Filter by region…"
            emptyText="No regions found."
            allowClear
            aria-label="Filter by region"
          />
        </div>

        {/* Per-field async filters — self-contained popover (its own "Filters" trigger
            with active-count badge). Receives flattened per-field values + callbacks. */}
        <CustomerCodeFilters
          segment={query.segment ?? ""}
          code={query.code ?? ""}
          customer={query.customer ?? ""}
          destination={query.destination ?? ""}
          cam={query.cam ?? ""}
          mob={query.mob ?? ""}
          onFilterChange={(patch) => applyFilter(patch)}
          onClearAll={() =>
            applyFilter({
              segment: "", code: "", customer: "", destination: "",
              cam: "", mob: "",
            })
          }
        />
      </div>

    </div>
  )
}
