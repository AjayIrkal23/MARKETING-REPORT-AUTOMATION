/**
 * Toolbar for the User Management table.
 *
 * Left side: `AsyncCombobox` for server-side user search (via `searchUserOptions`)
 *            + Status `FilterCombobox` (All / Invited / Active / Disabled)
 *            + Role `FilterCombobox` (All / Admin / User).
 * Right side: "Create user" button.
 *
 * All filters share the same search-and-select look (`FilterCombobox`) for
 * consistency with the Audit Logs toolbar. Filter state is owned by the parent
 * hook (`useUserManagement`); this component is purely presentational and
 * propagates changes upward via `onQueryChange`. No API calls, no client-side
 * filtering of server data.
 *
 * Contract source: USER-MANAGEMENT-PLAN.md §4.7
 */

import { PlusIcon } from "lucide-react"

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { FilterCombobox } from "@/components/common/FilterCombobox"
import type { FilterComboboxOption } from "@/components/common/FilterCombobox"
import { Button } from "@/components/ui/button"
import { searchUserOptions } from "@/api/admin/users/options"
import type { UserTableToolbarProps } from "@/types/admin/user-ui"
import type { UserStatus } from "@/types/admin/user"

// ---------------------------------------------------------------------------
// Constants — selectable option lists. The "All …" reset item is rendered by
// FilterCombobox itself; these are not client-side filters of server data.
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: FilterComboboxOption[] = [
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
]

const ROLE_OPTIONS: FilterComboboxOption[] = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * `UserTableToolbar` — filter bar + create action for the user management page.
 *
 * Props are defined in `types/admin/user-ui.ts` (`UserTableToolbarProps`).
 * The `onQueryChange` callback resets `page` to 1 automatically on filter
 * changes so the table does not show an out-of-range page.
 */
export function UserTableToolbar({
  query,
  onQueryChange,
  onCreateClick,
}: UserTableToolbarProps) {
  // Wrap onQueryChange to reset page on every filter/search change.
  function applyFilter(patch: Parameters<typeof onQueryChange>[0]) {
    onQueryChange({ page: 1, ...patch })
  }

  // Selecting a user option pushes its id as `q` (server search); clearing
  // resets `q`. We never mirror raw text into `q` (that would filter client-side).
  function handleUserSelect(value: string | null) {
    applyFilter({ q: value ?? undefined })
  }

  // The "All …" reset maps back to the existing "all" sentinel that the backend
  // normaliser already drops — preserving the prior `Select` semantics exactly.
  const currentStatus =
    query.status && query.status !== "all" ? query.status : null
  const currentRole = query.role && query.role !== "all" ? query.role : null

  return (
    <div
      role="toolbar"
      aria-label="User table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* ── Left: filters ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Server-driven user search */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={handleUserSelect}
            fetchOptions={(q) => searchUserOptions({ q, limit: 50 })}
            placeholder="Search users…"
            emptyText="No users found."
            allowClear
            aria-label="Search users"
          />
        </div>

        {/* Status filter */}
        <FilterCombobox
          value={currentStatus}
          onChange={(v) =>
            applyFilter({ status: (v ?? "all") as UserStatus | "all" })
          }
          options={STATUS_OPTIONS}
          allLabel="All statuses"
          aria-label="Filter by status"
          className="min-w-44 flex-1"
        />

        {/* Role filter */}
        <FilterCombobox
          value={currentRole}
          onChange={(v) =>
            applyFilter({ role: (v ?? "all") as "admin" | "user" | "all" })
          }
          options={ROLE_OPTIONS}
          allLabel="All roles"
          aria-label="Filter by role"
          className="min-w-44 flex-1"
        />
      </div>

      {/* ── Right: primary action ────────────────────────────────────── */}
      <Button
        size="sm"
        onClick={onCreateClick}
        aria-label="Create user"
        className="shrink-0 gap-1.5"
      >
        <PlusIcon className="size-3.5" aria-hidden />
        Create user
      </Button>
    </div>
  )
}
