/**
 * Toolbar for the Region Management table.
 *
 * Left side: `AsyncCombobox` for server-side region search (via `searchRegionOptions`)
 *            + Active/Inactive `FilterCombobox` (All statuses / Active / Inactive).
 * Right side: "Create region" button.
 *
 * All filters share the same search-and-select look (`FilterCombobox`) for
 * consistency with User Management and Audit Logs toolbars. Filter state is owned
 * by the parent hook (`useRegionManagement`); this component is purely presentational
 * and propagates changes upward via `onQueryChange`. No API calls, no client-side
 * filtering of server data.
 *
 * Contract source: .planning/regions/SPEC.md §2.4 + ADDENDUM.md §RegionTableToolbar
 */

import { PlusIcon } from "lucide-react"

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { FilterCombobox } from "@/components/common/FilterCombobox"
import type { FilterComboboxOption } from "@/components/common/FilterCombobox"
import { Button } from "@/components/ui/button"
import { searchRegionOptions } from "@/api/admin/regions/options"
import type { RegionTableToolbarProps } from "@/types/admin/region-ui"

// ---------------------------------------------------------------------------
// Constants — selectable option lists. The "All statuses" reset item is rendered
// by FilterCombobox itself; these are not client-side filters of server data.
// ---------------------------------------------------------------------------

const ACTIVE_OPTIONS: FilterComboboxOption[] = [
  { value: "true",  label: "Active"   },
  { value: "false", label: "Inactive" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * `RegionTableToolbar` — filter bar + create action for the Region Management page.
 *
 * Props are defined in `types/admin/region-ui.ts` (`RegionTableToolbarProps`).
 * The `onQueryChange` callback always includes `page: 1` on filter changes so
 * the table does not show an out-of-range page.
 *
 * Active filter state mapping (ADDENDUM §RegionTableToolbar):
 * - `query.active === "all"` | `undefined` → `currentActive = null` → "All statuses"
 * - `query.active === true`                → `currentActive = "true"` → "Active"
 * - `query.active === false`               → `currentActive = "false"` → "Inactive"
 * - On change: `v === "true"` → `active: true`; `v === "false"` → `active: false`;
 *   `v === null` → `active: "all"`
 */
export function RegionTableToolbar({
  query,
  onQueryChange,
  onCreate,
}: RegionTableToolbarProps) {
  // Wrap onQueryChange to reset page on every filter/search change.
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  // Map the boolean | "all" sentinel to a string value that FilterCombobox
  // understands (null = "All statuses").
  const currentActive =
    query.active !== undefined && query.active !== "all"
      ? String(query.active)  // boolean → "true" | "false"
      : null

  return (
    <div
      role="toolbar"
      aria-label="Region table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* ── Left: filters ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Server-driven region search via AsyncCombobox */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={(value) => applyFilter({ q: value ?? undefined })}
            fetchOptions={(q) => searchRegionOptions(q)}
            placeholder="Search regions…"
            emptyText="No regions found."
            allowClear
            aria-label="Search regions"
          />
        </div>

        {/* Active/Inactive filter */}
        <FilterCombobox
          value={currentActive}
          onChange={(v) =>
            applyFilter({ active: v === null ? "all" : v === "true" })
          }
          options={ACTIVE_OPTIONS}
          allLabel="All statuses"
          aria-label="Filter by status"
          className="min-w-44 flex-1"
        />
      </div>

      {/* ── Right: primary action ────────────────────────────────────── */}
      <Button
        size="sm"
        onClick={onCreate}
        aria-label="Create region"
        className="shrink-0 gap-1.5"
      >
        <PlusIcon className="size-3.5" aria-hidden />
        Create region
      </Button>
    </div>
  )
}
