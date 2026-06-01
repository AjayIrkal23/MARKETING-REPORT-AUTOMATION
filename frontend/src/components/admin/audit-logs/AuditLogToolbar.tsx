/**
 * Toolbar for the Audit Logs table — fully search-and-select.
 *
 * Every filter shares one combobox look for consistency:
 *   • AsyncCombobox   — server-side event search (free text → /options)
 *   • FilterCombobox  — Category / Outcome / Method / Status / Action
 *                       (options sourced from backend /facets, locally searchable)
 *   • DateRangePicker — inclusive timestamp range (dateFrom / dateTo)
 *
 * Read-only feature — no create button. Filter state is owned by the parent
 * hook (`useAuditLogs`); this component is presentational and only emits patches
 * via `onQueryChange`. No API calls, no client-side filtering of server data.
 *
 * Contract source: SPEC.md §B6
 */

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { FilterCombobox } from "@/components/common/FilterCombobox"
import type { FilterComboboxOption } from "@/components/common/FilterCombobox"
import { DateRangePicker } from "@/components/common/DateRangePicker"
import { searchAuditLogOptions } from "@/api/admin/audit-logs/options"
import type { AuditLogToolbarProps } from "@/types/admin/audit-log-ui"
import type { AuditCategory, AuditOutcome } from "@/types/admin/audit-log"

// Static fallbacks used until live facets load — the known taxonomy enums for
// the bounded category/outcome filters (not client-side filtering of data).
const STATIC_CATEGORIES: AuditCategory[] = [
  "http",
  "auth",
  "admin",
  "data",
  "system",
  "cron",
  "security",
  "users",
  "regions",
  "customer_codes",
  "jsw_stock",
  "jvml_stock",
]
const STATIC_OUTCOMES: AuditOutcome[] = ["success", "failure", "error"]

/** Map a list of facet values to `{ value, label }` combobox options. */
function toOptions(values: readonly (string | number)[]): FilterComboboxOption[] {
  return values.map((v) => ({ value: String(v), label: String(v) }))
}

export function AuditLogToolbar({
  query,
  onQueryChange,
  facets,
}: AuditLogToolbarProps) {
  const categoryOptions = toOptions(facets?.categories ?? STATIC_CATEGORIES)
  const outcomeOptions = toOptions(facets?.outcomes ?? STATIC_OUTCOMES)
  const methodOptions = toOptions(facets?.methods ?? [])
  const statusOptions = toOptions(facets?.statuses ?? [])
  const actionOptions = toOptions(facets?.actions ?? [])

  return (
    <div
      role="toolbar"
      aria-label="Audit log filters"
      className="flex w-full flex-wrap items-center gap-2"
    >
      {/* Server-driven event search */}
      <div className="min-w-56 flex-[2]">
        <AsyncCombobox
          value={query.q ?? null}
          onChange={(v) => onQueryChange({ q: v ?? undefined })}
          fetchOptions={(q) => searchAuditLogOptions({ q, limit: 50 })}
          placeholder="Search events…"
          emptyText="No matches."
          allowClear
          aria-label="Search audit logs"
        />
      </div>

      {/* Category */}
      <FilterCombobox
        value={query.category ?? null}
        onChange={(v) =>
          onQueryChange({ category: (v as AuditCategory) ?? undefined })
        }
        options={categoryOptions}
        allLabel="All categories"
        aria-label="Filter by category"
        className="min-w-32 flex-1"
      />

      {/* Outcome */}
      <FilterCombobox
        value={query.outcome ?? null}
        onChange={(v) =>
          onQueryChange({ outcome: (v as AuditOutcome) ?? undefined })
        }
        options={outcomeOptions}
        allLabel="All outcomes"
        aria-label="Filter by outcome"
        className="min-w-32 flex-1"
      />

      {/* Method */}
      <FilterCombobox
        value={query.method ?? null}
        onChange={(v) => onQueryChange({ method: v ?? undefined })}
        options={methodOptions}
        allLabel="All methods"
        aria-label="Filter by HTTP method"
        className="min-w-32 flex-1"
      />

      {/* Status code (backend-driven facet) */}
      <FilterCombobox
        value={query.status != null ? String(query.status) : null}
        onChange={(v) => onQueryChange({ status: v ? Number(v) : undefined })}
        options={statusOptions}
        allLabel="All statuses"
        aria-label="Filter by status code"
        className="min-w-32 flex-1"
      />

      {/* Action (backend-driven facet) */}
      <FilterCombobox
        value={query.action ?? null}
        onChange={(v) => onQueryChange({ action: v ?? undefined })}
        options={actionOptions}
        allLabel="All actions"
        aria-label="Filter by action"
        className="min-w-32 flex-1"
      />

      {/* Timestamp range */}
      <DateRangePicker
        from={query.dateFrom ?? null}
        to={query.dateTo ?? null}
        onChange={(r) =>
          onQueryChange({
            dateFrom: r.from ?? undefined,
            dateTo: r.to ?? undefined,
          })
        }
        aria-label="Filter by date range"
        className="min-w-56 flex-[2]"
      />
    </div>
  )
}
