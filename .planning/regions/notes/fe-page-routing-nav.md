# FE Page Composition + Routing + Nav — Region Management
> Area: `pages/admin/regions/index.tsx`, `App.tsx` diff, `nav-items.ts` diff, admin gating.
> Source files read: verified against disk as of 2026-05-30.

---

## 1. Exact page-header markup (copy verbatim)

From `pages/admin/users/index.tsx` (lines 111-129) and `pages/admin/audit-logs/index.tsx` (lines 40-55):

```tsx
{/* ── Page header ──────────────────────────────────────────────── */}
<div className="flex items-start gap-3">
  <span
    aria-hidden
    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
  >
    <MapPin className="size-4" />
  </span>
  <div>
    <h2 className="text-xl font-semibold tracking-tight text-foreground">
      Region Management
    </h2>
    <p className="text-sm text-muted-foreground mt-0.5">
      Manage regional distribution groups and their notification recipients.
    </p>
  </div>
</div>

<Separator />
```

Icon class: `"size-4"` (same as `ShieldUser`/`ScrollText` in sibling pages).
Outer wrapper: `<div className="flex flex-col gap-5">` (exact wrapper used by both existing pages).
Separator: `import { Separator } from "@/components/ui/separator"`.

---

## 2. Full page composition — `src/pages/admin/regions/index.tsx`

Pattern: thin orchestrator, zero business logic. Mirror `users/index.tsx` exactly.

```tsx
/**
 * RegionManagementPage — thin orchestrator for the admin Region Management screen.
 *
 * Layout:
 *   Page header (icon chip + h2 + subtitle)
 *   └─ <Separator />
 *   └─ RegionTableToolbar   (search + active filter + "Create region" button)
 *   └─ RegionTable          (server-driven sortable table)
 *   └─ RegionTablePagination
 *   └─ CreateRegionDialog / EditRegionDialog / ViewRegionSheet /
 *      ConfirmActionDialog
 *
 * All state lives in `useRegionManagement()`. Zero business logic here.
 *
 * Contract: SPEC.md §2.5
 * Route:    /admin/regions  (guarded by AdminRoute)
 */

import { MapPin } from "lucide-react"
import { Separator } from "@/components/ui/separator"

import { useRegionManagement } from "@/components/admin/regions/hooks/useRegionManagement"
import { RegionTableToolbar } from "@/components/admin/regions/RegionTableToolbar"
import { RegionTable } from "@/components/admin/regions/RegionTable"
import { RegionTablePagination } from "@/components/admin/regions/RegionTablePagination"
import { CreateRegionDialog } from "@/components/admin/regions/CreateRegionDialog"
import { EditRegionDialog } from "@/components/admin/regions/EditRegionDialog"
import { ViewRegionSheet } from "@/components/admin/regions/ViewRegionSheet"
import { ConfirmActionDialog } from "@/components/admin/regions/ConfirmActionDialog"

import type { RegionListQuery, RegionSortBy } from "@/types/admin/region"

export function RegionManagementPage() {
  const {
    query,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setActive,
    rows,
    meta,
    loading,
    error,
    dialog,
    openDialog,
    closeDialog,
    actions,
  } = useRegionManagement()

  function handleQueryChange(patch: Partial<RegionListQuery>) {
    if (patch.q      !== undefined) setSearch(patch.q ?? "")
    if (patch.active !== undefined) setActive(patch.active ?? "all")
    if (patch.page   !== undefined) setPage(patch.page)
    if (patch.limit  !== undefined) setLimit(patch.limit)
  }

  function handleSortChange(col: RegionSortBy) {
    const nextOrder =
      query.sortBy === col && query.sortOrder === "asc" ? "desc" : "asc"
    setSort(col, nextOrder)
  }

  const isCreate        = dialog.type === "create"
  const isView          = dialog.type === "view"
  const isEdit          = dialog.type === "edit"
  const isConfirmDelete = dialog.type === "confirm-delete"
  const isConfirmToggle = dialog.type === "confirm-toggle"

  const dialogRegion =
    dialog.type === "view"           ? dialog.region :
    dialog.type === "edit"           ? dialog.region :
    dialog.type === "confirm-delete" ? dialog.region :
    dialog.type === "confirm-toggle" ? dialog.region :
    null

  const confirmVariant =
    isConfirmDelete ? "delete" :
    dialogRegion?.active ? "deactivate" : "activate"

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <MapPin className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Region Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage regional distribution groups and their notification recipients.
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <RegionTableToolbar
        query={query}
        onQueryChange={handleQueryChange}
        onCreate={() => openDialog({ type: "create" })}
      />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <RegionTable
        rows={rows}
        loading={loading}
        error={error}
        sortBy={query.sortBy}
        sortOrder={query.sortOrder}
        onSort={handleSortChange}
        onView={(r)         => openDialog({ type: "view",           region: r })}
        onEdit={(r)         => openDialog({ type: "edit",           region: r })}
        onDelete={(r)       => openDialog({ type: "confirm-delete", region: r })}
        onToggleActive={(r) => openDialog({ type: "confirm-toggle", region: r })}
      />

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <RegionTablePagination
        meta={meta}
        isLoading={loading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* ── Dialogs / Sheet ──────────────────────────────────────────── */}

      <CreateRegionDialog
        open={isCreate}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        onSubmitted={actions.refetch}
      />

      <ViewRegionSheet
        open={isView}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        region={isView ? dialog.region : null}
      />

      <EditRegionDialog
        open={isEdit}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        region={isEdit ? dialog.region : null}
        onSubmitted={() => { closeDialog(); actions.refetch() }}
      />

      <ConfirmActionDialog
        open={isConfirmDelete || isConfirmToggle}
        onOpenChange={(open) => { if (!open) closeDialog() }}
        variant={confirmVariant}
        region={dialogRegion}
        onConfirm={() => {
          if (!dialogRegion) return
          if (isConfirmDelete) void actions.remove(dialogRegion.id)
          if (isConfirmToggle) void actions.toggleActive(dialogRegion)
        }}
      />

    </div>
  )
}
```

Note: `dialog.region` access is safe only when the discriminant type matches — same pattern as `users/index.tsx` `dialogUser` guard (lines 92-99).

---

## 3. Exact diff for `nav-items.ts`

File: `frontend/src/components/layout/nav-items.ts`

**Current line 2:**
```ts
import { LayoutDashboard, ScrollText, UsersRound } from "lucide-react"
```

**Replace with:**
```ts
import { LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"
```

**Current ADMIN_NAV_ITEMS (lines 14-17):**
```ts
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
]
```

**Replace with:**
```ts
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
]
```

No other changes to `nav-items.ts`. `titleForPath` at line 20 auto-picks up the new entry from `allItems = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]` — no edit needed there.

---

## 4. Exact diff for `App.tsx`

File: `frontend/src/App.tsx`

**Current imports block (lines 9-10):**
```tsx
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
```

**Replace with:**
```tsx
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
```

**Current AdminRoute block (lines 22-25):**
```tsx
<Route element={<AdminRoute />}>
  <Route path="/admin/users" element={<UserManagementPage />} />
  <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
</Route>
```

**Replace with:**
```tsx
<Route element={<AdminRoute />}>
  <Route path="/admin/users" element={<UserManagementPage />} />
  <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
  <Route path="/admin/regions" element={<RegionManagementPage />} />
</Route>
```

No other changes to `App.tsx`. The page export is a named export `RegionManagementPage` from `@/pages/admin/regions` (which resolves to `src/pages/admin/regions/index.tsx`), matching the barrel pattern of `users` and `audit-logs`.

---

## 5. Admin gating — full trace (CRITICAL INTEGRATION CHECK)

### How `selectIsAdmin` works

```ts
// src/store/auth/selectors.ts line 8
export const selectIsAdmin = (s: RootState) => s.auth.user?.role === "admin"
```

Checks `role === "admin"` on the `SessionUser` in Redux state. No `isAdmin` boolean — it compares the string `"admin"`.

### How `role` is set on `SessionUser`

```ts
// src/store/auth/session-user.ts
export function toSessionUser(authUser: AuthUser): SessionUser {
  return {
    name: authUser.emailid.split("@")[0],
    email: authUser.emailid,
    role: authUser.isAdmin ? "admin" : "user",  // ← maps bool → string
  }
}
```

Backend `AuthUser` (wire type at `src/types/auth/auth.ts`) carries `isAdmin: boolean`. `toSessionUser()` maps it to `role: "admin" | "user"`. `selectIsAdmin` then checks `role === "admin"`.

### Wiring in the auth slice

```ts
// src/store/auth/slice.ts
loginSuccess(state, action: PayloadAction<{ user: SessionUser }>) {
  state.isAuthenticated = true
  state.user = action.payload.user        // SessionUser with role set
  localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
}
```

`loginSuccess` is dispatched from the login flow with `{ user: toSessionUser(authUser) }`, persisting `role` to `localStorage`. `AuthBootstrap` re-confirms via `GET /auth/me` on mount and re-dispatches `loginSuccess`, so the role stays fresh.

### AdminRoute gating

```tsx
// src/routes/AdminRoute.tsx
const isAdmin = useAppSelector(selectIsAdmin)
if (!isAdmin) return <Navigate to="/home" replace />
return <Outlet />
```

`AdminRoute` wraps all existing admin routes AND will wrap the new Region route. The gating already works for User Management and Audit Logs. Region Management inherits it with NO auth changes.

### Sidebar gating

```tsx
// AppSidebar.tsx line 39 + 164
const isAdmin = useAppSelector(selectIsAdmin)
// ...
{isAdmin && (
  <SidebarGroup>
    {/* renders ADMIN_NAV_ITEMS */}
    {ADMIN_NAV_ITEMS.map((item) => ...)}
  </SidebarGroup>
)}
```

The "Administrator Config" group iterates `ADMIN_NAV_ITEMS` wholesale. Adding `{ label: "Region Management", to: "/admin/regions", icon: MapPin }` to `ADMIN_NAV_ITEMS` is sufficient — AppSidebar requires no edits. The new item inherits the same gold active-indicator logic (lines 178-185) and hover/active `SidebarMenuButton` classes automatically.

### Conclusion: NO auth changes needed

- `selectIsAdmin` tests `role === "admin"` — same check already gates users/audit-logs.
- `toSessionUser` already maps `AuthUser.isAdmin:bool` → `role:"admin"|"user"`.
- `AdminRoute` uses `<Outlet />` — adding a child `<Route>` inside is all that is needed.
- `AppSidebar` iterates `ADMIN_NAV_ITEMS` — appending the new entry is all that is needed.

Region Management is a pure additive extension; it touches exactly 2 shared files (`nav-items.ts`, `App.tsx`) with append-only edits.

---

## 6. Integration gotchas

- `@/pages/admin/regions` barrel import resolves via Vite alias `@` → `src/`. The file must be `src/pages/admin/regions/index.tsx` — the `index.tsx` part is what makes the barrel import `from "@/pages/admin/regions"` resolve correctly (same pattern as `users` and `audit-logs`).
- `dialog.type === "confirm-toggle"` discriminant: SPEC §2.2 names the variant `"confirm-toggle"` for activate/deactivate, while users uses separate `"confirm-enable"` / `"confirm-disable"`. Region uses a single toggle variant — the `ConfirmActionDialog` `variant` is derived at render time from `dialogRegion?.active` (see section 2 above).
- `MapPin` is already in `lucide-react` (used in existing error/empty states in the codebase per SPEC §2.4). Import from `"lucide-react"` — no separate install needed.
- The `titleForPath` helper in `nav-items.ts` does a `find` over `[...NAV_ITEMS, ...ADMIN_NAV_ITEMS]` — the new Region entry will be found automatically for `/admin/regions`, returning `"Region Management"` as the page title in `DashboardLayout`.
- SPEC §2.5 subtitle exact text: `"Manage regional distribution groups and their notification recipients."` — must match verbatim (used in docs/tests referencing the page).
