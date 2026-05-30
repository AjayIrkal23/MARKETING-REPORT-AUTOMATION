/**
 * Toolbar for the User Management table.
 *
 * Left side: `AsyncCombobox` for server-side user search (via `searchUserOptions`)
 *            + Status `Select` (All / Invited / Active / Disabled)
 *            + Role `Select` (All / Admin / User).
 * Right side: "Create user" button.
 *
 * All filter state is owned by the parent hook (`useUserManagement`); this
 * component is purely presentational — it propagates changes upward via
 * `onQueryChange`. No API calls, no client-side filtering.
 *
 * Contract source: USER-MANAGEMENT-PLAN.md §4.7
 */

import { PlusIcon } from "lucide-react"

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { searchUserOptions } from "@/api/admin/users/options"
import type { UserTableToolbarProps } from "@/types/admin/user-ui"
import type { UserStatus } from "@/types/admin/user"

// ---------------------------------------------------------------------------
// Constants — option lists (static; no client-side filtering of server data)
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
]

const ROLE_OPTIONS: { value: "admin" | "user" | "all"; label: string }[] = [
  { value: "all", label: "All roles" },
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

  // The combobox holds a selected user's value (their id) which maps to a
  // name-search selection. When the user picks an option, we push its value
  // as `q` so the table filters by that specific record; clearing sets `q`
  // back to undefined for a full list.
  //
  // NOTE: the AsyncCombobox drives server search via fetchOptions; we do not
  // mirror the text query into `q` directly (that would filter client-side).
  // Instead, selecting an option sets the id as `q`, consistent with how the
  // backend `/admin/users/options` endpoint surfaces user identities.
  function handleUserSelect(value: string | null) {
    applyFilter({ q: value ?? undefined })
  }

  function handleStatusChange(value: string) {
    applyFilter({ status: value as UserStatus | "all" })
  }

  function handleRoleChange(value: string) {
    applyFilter({ role: value as "admin" | "user" | "all" })
  }

  const currentStatus = query.status ?? "all"
  const currentRole = query.role ?? "all"

  return (
    <div
      role="toolbar"
      aria-label="User table filters"
      className="flex flex-wrap items-center gap-2"
    >
      {/* ── Left: filters ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Server-driven user search */}
        <div className="w-56 shrink-0">
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
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger
            aria-label="Filter by status"
            className="h-9 w-36 shrink-0"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Role filter */}
        <Select value={currentRole} onValueChange={handleRoleChange}>
          <SelectTrigger
            aria-label="Filter by role"
            className="h-9 w-32 shrink-0"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
