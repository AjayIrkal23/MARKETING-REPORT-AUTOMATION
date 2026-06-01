# FE Wiring — Nav + Routes + Audit Category Surfacing

Implementation note for SPEC §4 items 9–11 + audit category badge extension.
Builder applies exactly these edits — no guesswork, no discovery needed.

---

## 0. Pre-flight facts (verified against live files)

| File | Key observation |
|------|----------------|
| `nav-items.ts` | Imports only from `"lucide-react"`. `NAV_ITEMS` has 1 item (Dashboard). `ADMIN_NAV_ITEMS` has 4 items. `titleForPath` iterates `[...NAV_ITEMS, ...ADMIN_NAV_ITEMS]` — auto-resolves any label added to either array. |
| `App.tsx` | 36 lines. `/admin/*` routes live inside `<AdminRoute>`. No `/jsw-stock` or `/admin/settings` route exists yet. Imports are named (`{ HomePage }`, `{ CustomerCodeManagementPage }` etc.). |
| `audit-log.ts` | `AuditCategory` union currently ends at `"customer_codes"`. Missing `"jsw_stock"`. |
| `AuditCategoryBadge.tsx` | `CATEGORY_MAP` keyed by every `AuditCategory` value. Missing `jsw_stock` entry. Component typed via `AuditCategoryBadgeProps` whose `category` prop is `AuditCategory`. |
| `api/client.ts` | Has `getData`, `postData`, `patchData`, `deleteData`, `getList`, `buildQuery`. **No `putData` yet.** SPEC §4 item 9 requires adding it. |
| `lucide-react` | `Boxes` and `Settings` both exported (confirmed via node). `Boxes` is already used in `pages/dashboard/home/index.tsx`. |

---

## 1. `src/api/client.ts` — add `putData`

SPEC §4 item 9. Insert after `patchData`, before `deleteData`.

```ts
// old (patchData ends at line 67, deleteData at 70) — insert between them:

/** PUT a JSON body and unwrap `data`. */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}
```

Exact insertion point — old string to match:

```ts
/** DELETE a resource and unwrap `data` (may be `null` for 204-style responses). */
export async function deleteData<T>(path: string): Promise<T> {
```

New string (insert `putData` block before it):

```ts
/** PUT a JSON body and unwrap `data`. */
export async function putData<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: "PUT", body: JSON.stringify(body) })).data
}

/** DELETE a resource and unwrap `data` (may be `null` for 204-style responses). */
export async function deleteData<T>(path: string): Promise<T> {
```

---

## 2. `src/components/layout/nav-items.ts` — add JSW Stock List + Settings

SPEC §4 item 10. Two changes in one file.

### 2a. Import line — add `Boxes` and `Settings`

Old:
```ts
import { Building2, LayoutDashboard, MapPin, ScrollText, UsersRound } from "lucide-react"
```

New:
```ts
import { Boxes, Building2, LayoutDashboard, MapPin, ScrollText, Settings, UsersRound } from "lucide-react"
```

(Alphabetical order within the import — `Boxes` before `Building2`, `Settings` before `ScrollText` only if reordering, but existing order is not alphabetical so append consistently: `Boxes` first, `Settings` before `UsersRound` — simplest valid form is above.)

### 2b. `NAV_ITEMS` — add JSW Stock List after Dashboard

Old:
```ts
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
]
```

New:
```ts
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/home", icon: LayoutDashboard },
  { label: "JSW Stock List", to: "/jsw-stock", icon: Boxes },
]
```

### 2c. `ADMIN_NAV_ITEMS` — append Settings entry

Old:
```ts
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
]
```

New:
```ts
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "User Management", to: "/admin/users", icon: UsersRound },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: ScrollText },
  { label: "Region Management", to: "/admin/regions", icon: MapPin },
  { label: "Customer Codes", to: "/admin/customer-codes", icon: Building2 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
]
```

### `titleForPath` — no change required

`titleForPath` iterates `[...NAV_ITEMS, ...ADMIN_NAV_ITEMS]` and matches by
`pathname === i.to || pathname.startsWith(i.to + "/")`. Adding the two entries
above is sufficient — the function auto-resolves "JSW Stock List" for `/jsw-stock`
and "Settings" for `/admin/settings`.

---

## 3. `src/App.tsx` — add two routes + two imports

SPEC §4 item 11. Precise old→new diffs.

### 3a. Import block — add two page imports

Old (lines 9–12):
```tsx
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
```

New:
```tsx
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { JswStockListPage } from "@/pages/jsw-stock"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
import { SettingsPage } from "@/pages/admin/settings"
```

Notes:
- `JswStockListPage` is the default-exported page component from `src/pages/jsw-stock/index.tsx` — use a named re-export or `import JswStockListPage from "@/pages/jsw-stock"` if the page uses default export. SPEC says "Default export name imported in App.tsx" — use named import matching whatever the page exports. Mirror pattern: existing admin pages all use named exports (`export function UserManagementPage`). Builder of the page must match.
- `SettingsPage` from `src/pages/admin/settings/index.tsx` — also a named export.

### 3b. Route tree — add `/jsw-stock` under Protected+DashboardLayout (NOT AdminRoute)

Old (inside `<Route element={<DashboardLayout />}>`):
```tsx
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route element={<AdminRoute />}>
```

New:
```tsx
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/jsw-stock" element={<JswStockListPage />} />
            <Route element={<AdminRoute />}>
```

### 3c. Route tree — add `/admin/settings` inside AdminRoute

Old (inside `<Route element={<AdminRoute />}>`):
```tsx
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
```

New:
```tsx
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
```

### Final App.tsx shape (complete, for reference)

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthBootstrap } from "@/components/auth/AuthBootstrap"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { AdminRoute } from "@/routes/AdminRoute"
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"
import { JswStockListPage } from "@/pages/jsw-stock"
import { UserManagementPage } from "@/pages/admin/users"
import { AuditLogsPage } from "@/pages/admin/audit-logs"
import { RegionManagementPage } from "@/pages/admin/regions"
import { CustomerCodeManagementPage } from "@/pages/admin/customer-codes"
import { SettingsPage } from "@/pages/admin/settings"

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/jsw-stock" element={<JswStockListPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/regions" element={<RegionManagementPage />} />
              <Route path="/admin/customer-codes" element={<CustomerCodeManagementPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 4. `src/types/admin/audit-log.ts` — add `"jsw_stock"` to `AuditCategory`

Old:
```ts
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "regions"
  | "customer_codes"
```

New:
```ts
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "regions"
  | "customer_codes"
  | "jsw_stock"
```

`AuditCategoryBadgeProps.category` is typed as `AuditCategory` so the badge immediately
gains type coverage for `"jsw_stock"` without further changes to the props interface.

---

## 5. `src/components/admin/audit-logs/AuditCategoryBadge.tsx` — add `jsw_stock` entry

The `CATEGORY_MAP` is a `const` satisfying `Record<string, { label: string; className: string }>`.
Existing entries: http (slate), auth (indigo), admin (violet), data (teal), system (sky), cron
(amber), security (red), regions (emerald), customer_codes (rose).

Choose `orange` — unoccupied, semantically fits an industrial stock/inventory category.

Old (end of `CATEGORY_MAP`, before `} as const satisfies ...`):
```ts
  customer_codes: {
    label: "Customer Codes",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
  },
} as const satisfies Record<string, { label: string; className: string }>
```

New:
```ts
  customer_codes: {
    label: "Customer Codes",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
  },
  jsw_stock: {
    label: "JSW Stock",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400",
  },
} as const satisfies Record<string, { label: string; className: string }>
```

Note: The `CATEGORY_MAP` is typed `as const satisfies Record<string, {...}>` not as
`Record<AuditCategory, {...}>`, so TypeScript does NOT enforce exhaustiveness. Adding the
entry is sufficient — no other TS change needed. However, after adding `"jsw_stock"` to
`AuditCategory`, TSC will accept `<AuditCategoryBadge category="jsw_stock" />` because
`AuditCategoryBadgeProps.category: AuditCategory` now includes it. The runtime lookup
`CATEGORY_MAP[category]` will return the new entry correctly.

---

## 6. AppSidebar — no change needed

`AppSidebar.tsx` renders `NAV_ITEMS` and `ADMIN_NAV_ITEMS` directly from `nav-items.ts`
(line 110: `{NAV_ITEMS.map(...)}`, line 172: `{ADMIN_NAV_ITEMS.map(...)}`). The sidebar
re-renders automatically once the arrays are updated. No edits required to `AppSidebar.tsx`.

---

## 7. Dependency tree (build order for wiring pass)

```
1. src/api/client.ts              (putData — needed by settings API modules)
2. src/types/admin/audit-log.ts   (AuditCategory union — unblocks badge)
3. src/components/admin/audit-logs/AuditCategoryBadge.tsx  (jsw_stock entry)
4. src/components/layout/nav-items.ts  (icons + NAV_ITEMS + ADMIN_NAV_ITEMS)
5. src/App.tsx                    (routes + imports — depends on page files existing)
```

Items 1–4 are safe to apply before the page files exist (no import cycle risk).
Item 5 (`App.tsx`) must be applied after `src/pages/jsw-stock/index.tsx` and
`src/pages/admin/settings/index.tsx` are created by the FE-pages builder, or the
TypeScript build will fail with "Module not found". The orchestrator must sequence:
FE-pages build → wiring pass applies App.tsx.

---

## 8. Verification commands

After all wiring is applied and page stubs exist:

```bash
cd "/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/frontend"
npm run build   # tsc -b + vite — must exit 0
npm run lint    # eslint . — must be clean on changed files
```

TypeScript will catch: missing `putData` export, missing `"jsw_stock"` in `AuditCategory`,
missing route component imports, duplicate icon imports.
