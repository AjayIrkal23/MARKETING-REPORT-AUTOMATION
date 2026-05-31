# FE Table + Toolbar + Pagination + Badges — Region Management
> Implementation notes for the coding agent. All symbol names, prop names, and
> class tokens are quoted verbatim from the reference files. Do NOT invent variants.

---

## 1. SortableHead (internal to RegionTable)

Adapt `UserTable.tsx`'s internal `SortableHead` by replacing:
- `type SortKey = NonNullable<AdminUserListQuery["sortBy"]>` → `type SortKey = RegionSortBy`
- Import `RegionSortBy` from `@/types/admin/region`
- Props interface otherwise identical

```tsx
// RegionTable.tsx (internal, not exported)
import type { RegionSortBy } from "@/types/admin/region"
import type { RegionTableProps } from "@/types/admin/region-ui"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { TableHead } from "@/components/ui/table"

type SortKey = RegionSortBy  // "name" | "active" | "created_at" | "updated_at"

interface SortableHeadProps {
  label: string
  col: SortKey
  current: RegionSortBy | undefined
  order: "asc" | "desc" | undefined
  onSort: (col: SortKey) => void
  className?: string
}

function SortableHead({ label, col, current, order, onSort, className }: SortableHeadProps) {
  const active = current === col
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      onClick={() => onSort(col)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={cn("size-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </span>
    </TableHead>
  )
}
```

`sortProps` spread pattern (same as UserTable):
```tsx
const sortProps = { current: sortBy, order: sortOrder, onSort }
// Usage:
<SortableHead label="Name"    col="name"       {...sortProps} className="min-w-[200px]" />
<SortableHead label="Status"  col="active"     {...sortProps} />
<SortableHead label="Updated" col="updated_at" {...sortProps} />
```

---

## 2. RegionTable column layout

File: `src/components/admin/regions/RegionTable.tsx`

### Props interface (in `region-ui.ts`)
```ts
export interface RegionTableProps {
  rows: Region[]
  loading: boolean
  error: string | null
  sortBy: RegionSortBy | undefined
  sortOrder: "asc" | "desc" | undefined
  onSort: (col: RegionSortBy) => void
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}
```

Note: SPEC §2.2 uses `loading` (not `isLoading`) for RegionTableProps — use `loading`.

### Column headers
```tsx
<TableHeader>
  <TableRow>
    <SortableHead label="Name"       col="name"       {...sortProps} className="min-w-[200px]" />
    <TableHead className="text-muted-foreground">Recipients</TableHead>
    <SortableHead label="Status"     col="active"     {...sortProps} />
    <SortableHead label="Updated"    col="updated_at" {...sortProps} />
    <TableHead className="w-10" />
  </TableRow>
</TableHeader>
```

### Recipients cell — email chips with "+N more" cap

Show first 3, then "+N more" badge. Empty → `—` muted.
```tsx
<TableCell>
  {row.emails.length === 0 ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <div className="flex flex-wrap items-center gap-1">
      {row.emails.slice(0, 3).map((email) => (
        <span
          key={email}
          className="font-mono text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5"
        >
          {email}
        </span>
      ))}
      {row.emails.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{row.emails.length - 3} more
        </span>
      )}
    </div>
  )}
</TableCell>
```

### Status cell
```tsx
<TableCell>
  <RegionActiveBadge active={row.active} />
</TableCell>
```

### Updated cell
```tsx
import { format, parseISO } from "date-fns"

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), "dd MMM yyyy") } catch { return "—" }
}

<TableCell className="text-sm text-muted-foreground tabular-nums">
  {fmtDate(row.updated_at)}
</TableCell>
```

### Actions cell
```tsx
<TableCell className="text-right">
  <RowActionsMenu
    region={row}
    onView={onView}
    onEdit={onEdit}
    onDelete={onDelete}
    onToggleActive={onToggleActive}
  />
</TableCell>
```

---

## 3. Loading skeleton (8 rows)

Constant: `const SKELETON_ROWS = 8` (same as UserTable).

```tsx
if (loading) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Name", "Recipients", "Status", "Updated", ""].map((h) => (
            <TableHead key={h} className="text-muted-foreground">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-3.5 w-36" /></TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
            <TableCell><Skeleton className="size-7 rounded-md" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## 4. Empty state

Icon: `MapPin` from lucide-react (per SPEC §2.5 and §2.4).

```tsx
if (rows.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <MapPin className="size-8 opacity-40" aria-hidden />
      <p className="text-sm">No regions found</p>
      <p className="text-xs opacity-70">Adjust the filters or create a new region.</p>
    </div>
  )
}
```

---

## 5. Error state

```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
      <AlertTriangle className="size-8 opacity-70" aria-hidden />
      <p className="text-sm font-medium">Failed to load regions</p>
      <p className="text-xs text-muted-foreground">{error}</p>
    </div>
  )
}
```

---

## 6. RegionTableToolbar

File: `src/components/admin/regions/RegionTableToolbar.tsx`

### Props (in `region-ui.ts`)
```ts
export interface RegionTableToolbarProps {
  query: RegionListQuery
  onQueryChange: (patch: Partial<RegionListQuery>) => void
  onCreate: () => void
}
```

### Filter options constant
```tsx
const ACTIVE_OPTIONS: FilterComboboxOption[] = [
  { value: "true",  label: "Active" },
  { value: "false", label: "Inactive" },
]
```

### Full component structure
```tsx
import { PlusIcon } from "lucide-react"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { FilterCombobox } from "@/components/common/FilterCombobox"
import type { FilterComboboxOption } from "@/components/common/FilterCombobox"
import { Button } from "@/components/ui/button"
import { searchRegionOptions } from "@/api/admin/regions/options"
import type { RegionTableToolbarProps } from "@/types/admin/region-ui"

export function RegionTableToolbar({ query, onQueryChange, onCreate }: RegionTableToolbarProps) {
  function applyFilter(patch: Partial<typeof query>) {
    onQueryChange({ page: 1, ...patch })
  }

  function handleRegionSelect(value: string | null) {
    applyFilter({ q: value ?? undefined })
  }

  const currentActive =
    query.active !== undefined && query.active !== "all"
      ? String(query.active)   // boolean → "true"/"false" for FilterCombobox value
      : null

  return (
    <div
      role="toolbar"
      aria-label="Region table filters"
      className="flex flex-wrap items-center gap-2"
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Server-driven region search via AsyncCombobox */}
        <div className="min-w-64 flex-[2]">
          <AsyncCombobox
            value={query.q ?? null}
            onChange={handleRegionSelect}
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
            applyFilter({ active: v === null ? "all" : (v === "true") })
          }
          options={ACTIVE_OPTIONS}
          allLabel="All statuses"
          aria-label="Filter by status"
          className="min-w-44 flex-1"
        />
      </div>

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
```

Key integration note: `searchRegionOptions` from `@/api/admin/regions/options` has signature
`(q: string): Promise<RegionOption[]>`. `AsyncCombobox.fetchOptions` expects
`(q: string) => Promise<AsyncOption[]>`. `RegionOption` must match `AsyncOption`
(`{ value: string; label: string; sublabel?: string }`). Confirm `AsyncOption` in
`src/types/admin/options.ts` — it is the same shape, so `RegionOption` is compatible.

Active filter state mapping:
- `query.active === "all"` or `undefined` → `currentActive = null` → FilterCombobox shows "All statuses"
- `query.active === true` → `currentActive = "true"` → FilterCombobox shows "Active"
- `query.active === false` → `currentActive = "false"` → FilterCombobox shows "Inactive"
- On select: `v === "true"` → `active: true`; `v === "false"` → `active: false`; `v === null` → `active: "all"`

---

## 7. RegionTablePagination

File: `src/components/admin/regions/RegionTablePagination.tsx`

Direct clone of `UserTablePagination.tsx`. Change:
1. Import from `@/types/admin/region-ui` → `RegionTablePaginationProps`
2. Export name: `RegionTablePagination`
3. `aria-label="Table pagination"` stays unchanged

### Props interface (in `region-ui.ts`)
```ts
export interface RegionTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}
```

Everything else (layout, PAGE_SIZE_OPTIONS `[10, 20, 50]`, skeleton pulse span, button logic,
chevron icons, Select) is identical to `UserTablePagination`. No behavioral differences.

---

## 8. RegionActiveBadge

File: `src/components/admin/regions/RegionActiveBadge.tsx`

Pattern: mirror `UserStatusBadge.tsx`. Use `as const satisfies` pattern with a 2-entry `STATUS_MAP`.

```tsx
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RegionActiveBadgeProps } from "@/types/admin/region-ui"

const STATUS_MAP = {
  active: {
    label: "Active",
    variant: "default" as const,
    className: "border-transparent bg-emerald-600 text-white dark:bg-emerald-700",
  },
  inactive: {
    label: "Inactive",
    variant: "outline" as const,
    className: "border-border text-muted-foreground",
  },
} as const

export function RegionActiveBadge({ active, compact = false }: RegionActiveBadgeProps) {
  const cfg = active ? STATUS_MAP.active : STATUS_MAP.inactive
  return (
    <Badge
      variant={cfg.variant}
      className={cn(cfg.className, compact && "text-[10px] px-1.5 h-4")}
      aria-label={`Region status: ${cfg.label}`}
    >
      {cfg.label}
    </Badge>
  )
}
```

### Props (in `region-ui.ts`)
```ts
export interface RegionActiveBadgeProps {
  active: boolean
  compact?: boolean
}
```

Token reference (verbatim from UserStatusBadge + SPEC §2.7):
- Active:   `"border-transparent bg-emerald-600 text-white dark:bg-emerald-700"` — matches `variant="default"` + class override
- Inactive: `"border-border text-muted-foreground"` — matches `variant="outline"` + class override (same as "disabled" in UserStatusBadge)

---

## 9. RowActionsMenu (Region variant)

File: `src/components/admin/regions/RowActionsMenu.tsx`

Adapt the users version. Key differences:
- No `currentUserEmail` guard (no self-reference concept for regions)
- Menu items: View · Edit · Activate/Deactivate (toggle, contextual on `region.active`) · Delete (destructive)
- Trigger aria-label: `Actions for ${region.name}`
- `DropdownMenuLabel` shows `region.name`

```tsx
import { Eye, Pencil, ToggleLeft, ToggleRight, Trash2, EllipsisVertical } from "lucide-react"
// ToggleLeft = deactivate, ToggleRight = activate (or use PowerOff/Power)

// Contextual toggle:
{region.active ? (
  <DropdownMenuItem onSelect={() => onToggleActive(region)}>
    <ToggleLeft className="mr-2 size-4 text-muted-foreground" />
    Deactivate
  </DropdownMenuItem>
) : (
  <DropdownMenuItem onSelect={() => onToggleActive(region)}>
    <ToggleRight className="mr-2 size-4 text-muted-foreground" />
    Activate
  </DropdownMenuItem>
)}

// Delete:
<DropdownMenuItem variant="destructive" onSelect={() => onDelete(region)}>
  <Trash2 className="mr-2 size-4" />
  Delete
</DropdownMenuItem>
```

Trigger button: same tokens as UserTable's RowActionsMenu:
`className="size-7 text-muted-foreground hover:text-foreground"`, `size="icon"`, `variant="ghost"`.
Content: `className="w-48"`, `align="end"`.

---

## 10. RegionTable — RowActionsMenu props (region-ui.ts)

```ts
export interface RegionRowActionsMenuProps {
  region: Region
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}
```

---

## 11. AuditCategoryBadge — adding "regions" entry

File: `src/components/admin/audit-logs/AuditCategoryBadge.tsx`

The existing `CATEGORY_MAP` uses the `as const satisfies` pattern. Add:
```tsx
regions: {
  label: "Regions",
  className:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400",
},
```
SPEC §2.6 says "distinct token, e.g. indigo/violet". `admin` already uses violet.
Use **indigo** to keep it distinct from `admin`:
```tsx
regions: {
  label: "Regions",
  className:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400",
},
```
Wait: `auth` already uses indigo. Use a distinct color — **purple** is unused:
```tsx
regions: {
  label: "Regions",
  className:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-400",
},
```
This satisfies "distinct token" without colliding with existing entries (http=slate, auth=indigo, admin=violet, data=teal, system=sky, cron=amber, security=red).

Also add `"regions"` to `AuditCategory` type in `src/types/admin/audit-log.ts`:
```ts
export type AuditCategory =
  | "http" | "auth" | "admin" | "data" | "system" | "cron" | "security"
  | "regions"   // ← add
```
And update `AuditCategoryBadgeProps` in `audit-log-ui.ts` — it imports `AuditCategory` so it
gets the union automatically; no separate change needed if the type import is used.

---

## 12. Integration gotchas

1. **`query.active` type is `boolean | "all" | undefined`** (SPEC §2.1). FilterCombobox `value`
   is `string | null`. Convert: `active === true` → `"true"`, `active === false` → `"false"`,
   `"all"` / `undefined` → `null`. On change: `"true"` → `true`, `"false"` → `false`,
   `null` → `"all"`.

2. **`onSort` vs `onSortChange`** — UserTable prop is named `onSortChange`. SPEC §2.2 uses `onSort`.
   Use `onSort` for RegionTableProps (matching SPEC and AuditLogTable convention).

3. **`isLoading` vs `loading`** — UserTable uses `isLoading`; AuditLogTable uses `isLoading`.
   SPEC §2.2 defines `RegionTableProps.loading` (bare, not `isLoading`). Use `loading`.

4. **`AsyncCombobox.fetchOptions`** expects `(q: string) => Promise<AsyncOption[]>`.
   `searchRegionOptions` from `options.ts` returns `Promise<RegionOption[]>`. Since `RegionOption`
   (`{ value, label, sublabel? }`) structurally matches `AsyncOption`, this is directly compatible
   — no wrapper needed.

5. **`filterCombobox` `allLabel` must match the `CommandItem value`** used for the reset item
   (see FilterCombobox source: `<CommandItem value={allLabel} ...>`). Keep `allLabel="All statuses"`.

6. **No DateRangePicker in RegionTableToolbar** — RegionListQuery has no `dateFrom`/`dateTo`.
   DateRangePicker is referenced for audit logs only; do not include in RegionTableToolbar.

7. **SKELETON_ROWS = 8** — use exact constant from UserTable, not inline literal.

8. **`ConfirmActionDialog` reuse**: the users' `ConfirmActionDialog` supports variants
   `"delete" | "enable" | "disable"`. The SPEC §2.4 wants `"delete" | "activate" | "deactivate"`.
   These do NOT match — a region-local `ConfirmActionDialog` (or new variant entries in the shared
   one) is required. Create `src/components/admin/regions/ConfirmActionDialog.tsx` with
   `VARIANT_CONFIG` for `delete` (destructive), `activate`, `deactivate`. Mirror the structure
   exactly (same `AlertDialog` + `AlertDialogMedia` + spinner pattern).

9. **`RowActionsMenu` file name collision** — users already has
   `src/components/admin/users/RowActionsMenu.tsx`. The region version lives at
   `src/components/admin/regions/RowActionsMenu.tsx` — different directory, no conflict.

10. **`fmtDate` helper** — define locally in `RegionTable.tsx` (same 3-line try/catch pattern
    from UserTable). Uses `format` + `parseISO` from `date-fns` (already a project dep).

---

## 13. File reference map

| File to create | Clones / mirrors |
|---|---|
| `src/components/admin/regions/RegionTable.tsx` | `UserTable.tsx` (adapted) |
| `src/components/admin/regions/RegionTableToolbar.tsx` | `UserTableToolbar.tsx` (adapted) |
| `src/components/admin/regions/RegionTablePagination.tsx` | `UserTablePagination.tsx` (near-clone) |
| `src/components/admin/regions/RegionActiveBadge.tsx` | `UserStatusBadge.tsx` (adapted, 2 states) |
| `src/components/admin/regions/RowActionsMenu.tsx` | `users/RowActionsMenu.tsx` (adapted, no self-guard) |
| `src/components/admin/regions/ConfirmActionDialog.tsx` | `users/ConfirmActionDialog.tsx` (new variants) |
| `src/types/admin/region-ui.ts` | `user-ui.ts` / `audit-log-ui.ts` |
