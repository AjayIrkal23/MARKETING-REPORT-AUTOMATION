# Frontend Types + API Layer — Region Management
## Implementation Notes for Coding Agent

> Produced from reading real source files — every name, path, and snippet is
> verified against the live codebase. Do NOT invent names not listed here.
> SPEC source: `.planning/regions/SPEC.md`.

---

## 0. Import alias

All project imports use the `@/` alias resolving to `frontend/src/`.
Example confirmed in `user.ts`, `audit-log.ts`, `client.ts`:

```ts
import type { PageQuery } from "@/types/api/envelope"
import { buildQuery, getList } from "@/api/client"
```

---

## 1. `src/types/api/envelope.ts` — shapes you will import (DO NOT redefine)

```ts
// Confirmed exports (39 lines, read verbatim):
export type SortOrder = "asc" | "desc"
export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; sortBy: string; sortOrder: SortOrder }
export interface ApiSuccess<T> { success: true; data: T; message: string; meta?: PaginationMeta | null }
export interface PageQuery { page?: number; limit?: number; sortOrder?: SortOrder }
export interface PaginatedResult<T> { data: T[]; meta: PaginationMeta }
```

`RegionListQuery` **extends `PageQuery`** — exact same pattern as `AdminUserListQuery`.

---

## 2. `src/types/admin/options.ts` — SHARED `AsyncOption` type (DO NOT duplicate)

```ts
// Confirmed exact shape (25 lines):
export interface AsyncOption {
  value: string
  label: string
  sublabel?: string
}
export interface OptionsQuery { q?: string; limit?: number }
```

**`RegionOption` in the SPEC is structurally identical to `AsyncOption`.**
The coding agent must NOT create a new `RegionOption` type in `region.ts`.
Instead, `searchRegionOptions` returns `AsyncOption[]` and the import is:

```ts
import type { AsyncOption } from "@/types/admin/options"
```

**BLOCKER:** SPEC §2.1 defines a standalone `RegionOption { value; label; sublabel? }` type
inside `region.ts` and §2.3 says `options.ts` returns `Promise<RegionOption[]>`. This
is structurally identical to the existing `AsyncOption` from `types/admin/options.ts`
(same fields, same optional sublabel). The pattern in `api/admin/users/options.ts` already
imports `AsyncOption` from `types/admin/options` and returns `Promise<AsyncOption[]>`.
**Decision: reuse `AsyncOption` — do NOT declare a separate `RegionOption` type.**
Use `AsyncOption` in both `region.ts` (if a type alias is needed: `export type RegionOption = AsyncOption`)
and in `api/admin/regions/options.ts`. This is consistent with the user module and avoids
type duplication. The downstream `AsyncCombobox` already accepts `AsyncOption[]`.

---

## 3. `src/types/admin/region.ts` (NEW)

Exact shape to write — verified against `user.ts` (74 lines) and `audit-log.ts` patterns:

```ts
/**
 * Admin region API contracts — aligned with the backend `region` domain.
 *
 * Endpoint: `GET /admin/regions`, `POST /admin/regions`, `PATCH /admin/regions/{id}`, etc.
 * Contract source: .planning/regions/SPEC.md §2.1.
 */

import type { PageQuery } from "@/types/api/envelope"
import type { AsyncOption } from "@/types/admin/options"

/** Whitelisted sort keys for `GET /admin/regions` (must match backend `RegionSortBy` Literal). */
export type RegionSortBy = "name" | "active" | "created_at" | "updated_at"

/** A region distribution group returned by all admin region endpoints. */
export interface Region {
  id: string
  name: string
  emails: string[]
  active: boolean
  created_at: string   // ISO-8601
  updated_at: string   // ISO-8601
}

/**
 * Query params for `GET /admin/regions`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 */
export interface RegionListQuery extends PageQuery {
  sortBy?: RegionSortBy
  /** Case-insensitive search over name + emails (max 100 chars). */
  q?: string
  /** Filter by active state; "all" = UI sentinel stripped before request. */
  active?: boolean | "all"
}

/** Request body for `POST /admin/regions`. */
export interface CreateRegionInput {
  name: string
  emails: string[]
  active: boolean
}

/**
 * Request body for `PATCH /admin/regions/{id}`.
 * All fields optional — send only changed fields.
 */
export interface UpdateRegionInput {
  name?: string
  emails?: string[]
  active?: boolean
}

/** Re-export alias so callers in `api/admin/regions/` can import RegionOption locally. */
export type RegionOption = AsyncOption
```

**Key decisions verified against source:**
- `created_at` / `updated_at` are snake_case strings (ISO-8601), matching backend `RegionPublic` — NOT camelCase like `AdminUser.createdAt`. Reason: backend model uses Python snake_case and serializes directly. Confirmed pattern: `AuditLog` also uses `timestamp` (snake-adjacent) and `AdminUser` uses `createdAt` (JS-style alias from the ORM). Since the SPEC explicitly writes `created_at`/`updated_at` in §2.1, follow the SPEC.
- `active?: boolean | "all"` — the `"all"` value is a **UI sentinel only**, stripped in `normalize()` before the API call. This matches `status?: UserStatus | "all"` in `AdminUserListQuery`.

---

## 4. `src/types/admin/region-ui.ts` (NEW)

Mirror structure confirmed from `user-ui.ts` (189 lines) and `audit-log-ui.ts` (125 lines).
The `DialogBaseProps` is redeclared locally in EACH `*-ui.ts` file (user-ui.ts line 22,
audit-log-ui.ts line 27) — this is the project convention, not an import from a shared file.

```ts
/**
 * Admin region component prop contracts (`<feature>-ui.ts` convention).
 */

import type { Region, RegionListQuery, CreateRegionInput, UpdateRegionInput } from "./region"
import type { PaginationMeta } from "@/types/api/envelope"

// Redeclared locally per project convention (see user-ui.ts, audit-log-ui.ts)
export interface DialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface CreateRegionDialogProps extends DialogBaseProps {
  onSubmitted: () => void
}

export interface EditRegionDialogProps extends DialogBaseProps {
  region: Region | null
  onSubmitted: (updated: Region) => void
}

export interface ViewRegionSheetProps extends DialogBaseProps {
  region: Region | null
}

export type ConfirmRegionActionVariant = "delete" | "deactivate" | "activate"

export interface ConfirmRegionActionProps extends DialogBaseProps {
  variant: ConfirmRegionActionVariant
  targetLabel: string       // region.name shown in confirmation message
  onConfirm: () => void
  isLoading?: boolean
}

export interface RegionActiveBadgeProps {
  active: boolean
  compact?: boolean
}

export interface RowActionsMenuProps {
  region: Region
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

export interface RegionTableProps {
  rows: Region[]
  isLoading: boolean
  error: string | null
  sortBy: RegionListQuery["sortBy"]
  sortOrder: RegionListQuery["sortOrder"]
  onSort: (sortBy: NonNullable<RegionListQuery["sortBy"]>) => void
  onView: (region: Region) => void
  onEdit: (region: Region) => void
  onDelete: (region: Region) => void
  onToggleActive: (region: Region) => void
}

export interface RegionTableToolbarProps {
  query: RegionListQuery
  onQueryChange: (patch: Partial<RegionListQuery>) => void
  onCreate: () => void
}

export interface RegionTablePaginationProps {
  meta: PaginationMeta | null
  isLoading: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export interface UseRegionManagementResult {
  // Query state
  query: RegionListQuery
  setQuery: (patch: Partial<RegionListQuery>) => void
  // Fetch state
  rows: Region[]
  meta: PaginationMeta | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  // Dialog discriminated union (SPEC §2.4 pattern)
  dialog: { type: "create" } | { type: "view"; region: Region } | { type: "edit"; region: Region } | { type: "confirm-delete"; region: Region } | { type: "confirm-toggle"; region: Region } | null
  openDialog: (d: UseRegionManagementResult["dialog"]) => void
  closeDialog: () => void
  // Mutations (toast + refetch handled internally)
  handleCreate: (input: CreateRegionInput) => Promise<void>
  handleUpdate: (id: string, input: UpdateRegionInput) => Promise<void>
  handleDelete: (id: string) => Promise<void>
  handleToggleActive: (region: Region) => Promise<void>
}
```

**Note on `dialog` state:** SPEC §2.4 says "discriminated union `{type: ...}`" — this
differs from user-ui.ts which uses flat `selectedUser + confirmAction + separate open flags`.
Both are valid; the discriminated union is more concise for 4 dialog types. Use whichever
fits ≤250 lines in the hook. If the hook exceeds 250 lines, split mutations per SPEC §2.4.

---

## 5. `src/api/client.ts` — helpers to use (DO NOT re-implement)

Confirmed exports and signatures (88 lines, read verbatim):

```ts
// Import path:
import { buildQuery, getList, getData, postData, patchData, deleteData } from "@/api/client"
import { ApiError } from "@/api/client"

// Signatures:
buildQuery(params: Record<string, string | number | undefined>): string
// → skips undefined and "" values; prepends "?" if non-empty

getList<T>(path: string): Promise<PaginatedResult<T>>
// → GETs path, unwraps { data: T[], meta: PaginationMeta }

getData<T>(path: string): Promise<T>
postData<T>(path: string, body: unknown): Promise<T>
patchData<T>(path: string, body: unknown): Promise<T>
deleteData<T>(path: string): Promise<T>   // returns null for delete
```

**`buildQuery` gotcha:** accepts `string | number | undefined` values only.
A `boolean` value (`active: true/false`) must be converted to string before passing.
Confirmed: `buildQuery` calls `String(value)` — so passing `true` → `"true"`, `false` → `"false"`.
However the function signature is `Record<string, string | number | undefined>` — TypeScript
will reject a raw `boolean`. The `normalize()` function must cast:
```ts
active: q.active === true ? "true" : q.active === false ? "false" : undefined
```

---

## 6. `src/api/admin/regions/` (NEW — 6 files)

### Directory structure to create:
```
src/api/admin/regions/
  list.ts
  get.ts
  create.ts
  update.ts
  remove.ts
  options.ts
```

---

### `list.ts`

Pattern: **mirrors `audit-logs/list.ts`** (39 lines) — uses explicit `normalize()` to strip
`"all"` sentinel. The user `list.ts` (9 lines) does NOT normalize because users have no "all"
sentinel on a boolean field. Regions have `active?: boolean | "all"` → must normalize.

```ts
/** `GET /admin/regions` — backend-driven paginated region list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { Region, RegionListQuery } from "@/types/admin/region"

/**
 * Drop "all" sentinel and convert boolean active to string before sending.
 * Backend does not understand "all"; absent param = no filter.
 */
function normalize(
  q: RegionListQuery,
): Record<string, string | number | undefined> {
  return {
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder,
    q: q.q,
    active:
      q.active === "all" ? undefined
      : q.active === true ? "true"
      : q.active === false ? "false"
      : undefined,
  }
}

export function listRegions(
  query: RegionListQuery = {},
): Promise<PaginatedResult<Region>> {
  return getList<Region>(`/admin/regions${buildQuery(normalize(query))}`)
}
```

---

### `get.ts`

```ts
/** `GET /admin/regions/{id}` — fetch a single region by ID. */

import { getData } from "@/api/client"
import type { Region } from "@/types/admin/region"

export function getRegion(id: string): Promise<Region> {
  return getData<Region>(`/admin/regions/${id}`)
}
```

---

### `create.ts`

```ts
/** `POST /admin/regions` — create a new region. */

import { postData } from "@/api/client"
import type { Region, CreateRegionInput } from "@/types/admin/region"

export function createRegion(input: CreateRegionInput): Promise<Region> {
  return postData<Region>("/admin/regions", input)
}
```

---

### `update.ts`

```ts
/** `PATCH /admin/regions/{id}` — update mutable fields. */

import { patchData } from "@/api/client"
import type { Region, UpdateRegionInput } from "@/types/admin/region"

export function updateRegion(id: string, input: UpdateRegionInput): Promise<Region> {
  return patchData<Region>(`/admin/regions/${id}`, input)
}
```

---

### `remove.ts`

Pattern: mirrors `users/remove.ts` (7 lines) — returns `Promise<null>`.

```ts
/** `DELETE /admin/regions/{id}` — permanently remove a region. */

import { deleteData } from "@/api/client"

export function removeRegion(id: string): Promise<null> {
  return deleteData<null>(`/admin/regions/${id}`)
}
```

---

### `options.ts`

Pattern: mirrors `users/options.ts` (8 lines) — returns `AsyncOption[]`.
Uses `AsyncOption` from `types/admin/options` (NOT a local RegionOption type).

```ts
/** `GET /admin/regions/options` — backend-driven async option search (≤20 results). */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"

export function searchRegionOptions(q: string): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(
    `/admin/regions/options${buildQuery({ q, limit: 20 })}`,
  )
}
```

**Note:** SPEC says `limit: 20` hard-coded in the call. Backend `/options` endpoint uses
`RegionOptionsQuery` with default 20, max 50. Confirmed match.

---

## 7. Integration gotchas

1. **`buildQuery` rejects `boolean` type.** Always convert `active: boolean` → `"true"/"false"` string in `normalize()`. The helper signature is `Record<string, string | number | undefined>` — no boolean slot.

2. **`"all"` sentinel exists ONLY in the frontend.** The backend `RegionListQuery` uses `active: bool | None` (Python), not the string `"all"`. The `normalize()` function in `list.ts` is the sole translation point.

3. **`RegionOption` = `AsyncOption`.** Do not declare a second type with the same shape. The `RegionOption` alias in `region.ts` is only for local readability; the canonical type is `AsyncOption` from `types/admin/options`.

4. **`DialogBaseProps` is redeclared per feature file** (confirmed in user-ui.ts and audit-log-ui.ts). Do not import it from a shared location — copy the 4-line block into `region-ui.ts`.

5. **`getList` vs `getData` for list endpoint.** The paginated list uses `getList<Region>` (returns `PaginatedResult<Region>`). The options endpoint uses `getData<AsyncOption[]>` (returns plain array). Do not mix them.

6. **`AuditCategory` union must gain `"regions"`** in `src/types/admin/audit-log.ts` as a wiring edit (SPEC §2.6). This is a separate wiring task — not in region.ts or region-ui.ts.

7. **File size.** SPEC requires every file ≤250 lines. These 6 API modules are each 8–39 lines. `region.ts` will be ~55 lines. `region-ui.ts` will be ~90 lines. Both comfortably within limit.

8. **Path for `RegionListQuery.active` in `buildQuery` spread.** The simple spread used in `users/list.ts` (`buildQuery({ ...query })`) would break here because `query.active` can be `boolean | "all"`. Always use the explicit `normalize()` function — do NOT spread the query object directly.

---

## 8. Cross-reference: confirmed existing file paths

| File | Lines | Confirmed |
|------|-------|-----------|
| `frontend/src/types/api/envelope.ts` | 39 | yes |
| `frontend/src/types/admin/options.ts` | 25 | yes — `AsyncOption`, `OptionsQuery` |
| `frontend/src/types/admin/user.ts` | 74 | yes |
| `frontend/src/types/admin/user-ui.ts` | 189 | yes |
| `frontend/src/types/admin/audit-log.ts` | 123 | yes |
| `frontend/src/types/admin/audit-log-ui.ts` | 125 | yes |
| `frontend/src/api/client.ts` | 88 | yes |
| `frontend/src/api/admin/users/list.ts` | 9 | yes |
| `frontend/src/api/admin/users/options.ts` | 8 | yes |
| `frontend/src/api/admin/users/get.ts` | 8 | yes |
| `frontend/src/api/admin/users/create.ts` | 8 | yes |
| `frontend/src/api/admin/users/update.ts` | 8 | yes |
| `frontend/src/api/admin/users/remove.ts` | 7 | yes |
| `frontend/src/api/admin/audit-logs/list.ts` | 39 | yes — `normalize()` pattern |
