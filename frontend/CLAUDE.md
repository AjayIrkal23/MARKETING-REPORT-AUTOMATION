# Frontend — Agent Surface Guide

JSW Steel Marketing Report Automation — Vite + React dashboard.
Root: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/frontend/`

---

## Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 8 |
| UI framework | React 19.2 |
| Language | TypeScript ~6.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Component library | shadcn/ui (~55 components, Radix UI based) |
| State management | Redux Toolkit 2 + react-redux 9 |
| Routing | react-router-dom 7 |
| Charts | recharts 3 |
| Icons | lucide-react |
| Toasts | sonner |
| Theming | next-themes |
| Date utilities | date-fns |
| Carousel | embla-carousel |
| Drawer | vaul |
| Command palette | cmdk |
| OTP input | input-otp |

---

## Commands

```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # vite preview → http://localhost:4173
```

---

## Actual src/ Structure

> This tree reflects the **verified source on disk** as of 2026-05-29.
> `src/` is still minimal; some files referenced elsewhere do **not yet exist** — see "Scaffold gaps" below.

```
src/
├── app/
│   ├── store.ts          # Redux store configuration
│   └── hooks.ts          # Typed useAppDispatch / useAppSelector
├── features/
│   └── auth/
│       └── authSlice.ts  # loginSuccess / logout; hydrated from localStorage
├── lib/
│   ├── api.ts            # Backend HTTP client (centralised)
│   └── utils.ts          # cn() Tailwind class merge helper
├── routes/
│   └── ProtectedRoute.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── HomePage.tsx
├── components/
│   ├── theme-provider.tsx  # ThemeProvider (light / dark)
│   └── ui/               # ~55 shadcn/ui primitives
│       └── *.tsx
├── hooks/
│   └── use-mobile.ts
├── App.tsx
├── main.tsx
└── index.css             # JSW brand tokens + Tailwind base
```

---

## Routing

| Path | Page | Auth |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/home` | `HomePage` | Protected |
| `/admin/users` | `UserManagementPage` | Admin (`AdminRoute`) |
| `/admin/audit-logs` | `AuditLogsPage` | Admin (`AdminRoute`) |
| `/admin/regions` | `RegionManagementPage` | Admin (`AdminRoute`) |
| `/admin/customer-codes` | `CustomerCodeManagementPage` | Admin (`AdminRoute`) |
| `/` | Redirect → `/home` | — |
| `*` | Redirect → `/home` | — |

**ProtectedRoute**: reads `auth.isAuthenticated` from Redux store; redirects to `/login` when `false`.
**AdminRoute** (`src/routes/AdminRoute.tsx`): additionally requires `selectIsAdmin`; redirects non-admins to `/home`. Admin pages live under `src/pages/admin/<feature>/` and their sidebar entries under the "Administrator Config" group in `src/components/layout/nav-items.ts` (`ADMIN_NAV_ITEMS`).

### Audit Logs feature (`src/components/admin/audit-logs/`, page `src/pages/admin/audit-logs/`)

Admin-only system-activity view, built to mirror User Management 1:1. Server-driven only
(no client-side filtering): sortable `AuditLogTable`, `AuditLogToolbar` (backend async-select via
`AsyncCombobox` + category/outcome/method filter `Select`s), `AuditLogPagination`, and a tabbed
`ViewAuditLogSheet` (Details / Request / Response / Raw JSON). Types in `src/types/admin/audit-log.ts`
(+ `-ui.ts`); API in `src/api/admin/audit-logs/{list,get,options,facets}.ts`; state in
`hooks/useAuditLogs.ts`. Add new admin pages by mirroring this folder set.

### Region Management feature (`src/components/admin/regions/`, page `src/pages/admin/regions/`)

Admin-only CRUD for notification/distribution groups (`Region = {name, emails[], active}`),
built to mirror User Management 1:1. Server-driven only: sortable `RegionTable`
(Name · Recipients email-chips · Status · Updated), `RegionTableToolbar` (backend
`AsyncCombobox` search via `searchRegionOptions` + Active/Inactive `FilterCombobox`),
`RegionTablePagination`, `ViewRegionSheet`, and `CreateRegionDialog`/`EditRegionDialog`
with the accessible **`EmailChipInput`** (Enter/comma add, Backspace/X remove, per-email
regex + case-insensitive dedupe). Delete/activate/deactivate use the **shared**
`@/components/admin/users/ConfirmActionDialog` (its `ConfirmActionVariant` in
`types/admin/user-ui.ts` was extended with `activate`/`deactivate`). Types in
`src/types/admin/region.ts` (+ `-ui.ts`; `RegionOption = AsyncOption` alias); API in
`src/api/admin/regions/{list,get,create,update,remove,options}.ts` (`list` strips the
`active:"all"` UI sentinel before calling the backend); state split across
`hooks/useRegionManagement.ts` + `hooks/useRegionMutations.ts`. Region mutations are
audited backend-side under the new `"regions"` audit category, which also appears in the
Audit Logs category filter (emerald `AuditCategoryBadge`).

---

## State

- **Store**: `src/app/store.ts` — single Redux store.
- **Typed hooks**: `useAppDispatch` / `useAppSelector` in `src/app/hooks.ts`; use these, never raw `useDispatch` / `useSelector`.
- **Auth slice** (`src/features/auth/authSlice.ts`):
  - Actions: `loginSuccess`, `logout`.
  - Persisted to `localStorage`; rehydrated on store init.
  - **Mock auth**: any non-empty username + password is accepted — no real API call yet.

> **Scaffold gaps — gotcha**: `src/` has no data/ping slice
> (`src/features/ping/pingSlice.ts` / `sendPing`), no dashboard layout
> (`src/components/layout/DashboardLayout.tsx`), and no logo (`src/components/jsw-logo.tsx`).
> **None of these exist as of 2026-05-29**, and the frontend changes often
> (`README.md` + `index.css` were edited mid-setup). Verify the live `src/` tree before
> relying on any doc for feature completeness.

---

## Theming

`src/index.css` defines the standard shadcn/ui oklch design tokens under `:root` and `.dark`, plus the Geist Variable font:

```css
--primary        /* shadcn primary */
--destructive    /* shadcn destructive */
--sidebar        /* sidebar surface */
--color-chart-1  /* ...chart palette, etc. */
```

`ThemeProvider` (in `src/components/theme-provider.tsx`) wraps the app and handles light / dark switching via next-themes.

> **No JSW-specific brand tokens (`--jsw-blue` / `--jsw-red` / `--jsw-steel`) exist yet.** Add them to `index.css` before referencing them; until then use the shadcn semantic tokens above. Always use semantic tokens rather than raw hex values in new components.

---

## API Access

- All `/api/*` requests are **proxied to the backend** (`http://localhost:8000`) by `vite.config.ts`.
- Override the base URL with the env var `VITE_API_URL` if needed.
- **Single client**: `src/lib/api.ts` — all backend calls go through this file.
- Do **not** call `fetch` or `axios` directly inside components or hooks; route through `src/lib/api.ts`.

Expected backend response envelopes (when the API is implemented):

```ts
// success
{ success: true, data: T, message: string, meta?: PaginationMeta }

// error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

Pagination defaults: `page=1`, `limit=20`, max `100`; `sortBy` and `sortOrder` from a server-side whitelist.

---

### Customer Code Management feature (`src/components/admin/customer-codes/`, page `src/pages/admin/customer-codes/`)

Admin-only CRUD + **Excel import** for SAP customer-account mappings, each **linked to a Region by id**
(`region_id`), built to mirror Region/User 1:1. Server-driven only: sortable `CustomerCodeTable`
(Segment badge · Code · Customer · Destination · Region · CAM · ROUTE), `CustomerCodeTableToolbar`
(free-text `q` search + Region `AsyncCombobox` filter + a self-contained **`CustomerCodeFilters`** popover
with one backend `AsyncCombobox` per field via `searchCustomerCodeFieldOptions(field)` → `/admin/customer-codes/options?field=`),
`CustomerCodeTablePagination`, `ViewCustomerCodeSheet`, `CreateCustomerCodeDialog`/`EditCustomerCodeDialog`
(shared `CustomerCodeFormFields`; required Segment/Code/Customer/Destination + **required Region `AsyncCombobox`**),
and a guided **`ImportCustomerCodesDialog`** (pick region → download template → upload `.xlsx` → row-level result
summary via `ImportResultSummary`). Delete uses the shared `users/ConfirmActionDialog` (`delete` variant).
`SegmentBadge` gives each row a quiet semantic tint. Types in `src/types/admin/customer-code.ts` (+ `-ui.ts`);
API in `src/api/admin/customer-codes/{list,get,create,update,remove,options,import,template}.ts`. **Exception to
the "all calls via the client" rule:** `import.ts` (multipart `FormData`) and `template.ts` (xlsx blob download)
use raw `fetch` (`credentials:"include"`) because the JSON `apiClient` only handles enveloped JSON — intentional
and documented in those files. State: `hooks/useCustomerCodeManagement.ts` (pagination + sort + `q` + per-field
filters + `region`; single `setFilter(patch)`) + `hooks/useCustomerCodeMutations.ts`. Query keys are **snake_case**
(`ship_to`, `ship_to_customer`, `region`) to match the backend exactly. Mutations are audited under the new
`"customer_codes"` audit category (also surfaced in the Audit Logs filter/badge).

## Mandatory Frontend Rules

These rules are enforced globally via `~/.claude/` hooks. Summary for this repo:

| Rule | Detail |
|---|---|
| No client-side filtering | Never filter / sort / paginate server data in the browser; send query params to the API |
| Types location | Domain types in `src/types/<domain>/` (create when adding a new domain) |
| API calls | Only in `src/lib/api.ts` or a dedicated `src/api/<domain>/` module — never inside components |
| Design tokens | Use shadcn semantic tokens (`--primary`, `--destructive`, …); JSW brand tokens not yet defined; contrast ratio ≥ 4.5:1 |
| File size | No file > 250 lines; split components at > 200 lines |
| Tailwind v4 | Use `@tailwindcss/vite` plugin; do not use `tailwind.config.js` (v3 pattern) |
| shadcn components | Extend from `src/components/ui/`; do not fork Radix primitives directly |
| Typed Redux hooks | Always `useAppDispatch` / `useAppSelector` — never raw `useDispatch` / `useSelector` |

---

## Related Docs

- Root overview: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/README.md`
- Backend guide: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/backend/` (FastAPI, port 8000)
- Domain data dictionary: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/macro_docs/README.md`
