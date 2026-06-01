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
| `/jsw-stock` | `JswStockListPage` | Protected (**all authenticated users**, not admin) |
| `/jvml-stock` | `JvmlStockListPage` | Protected (**all authenticated users**, not admin) |
| `/credit-report` | `CreditReportPage` | Protected (**all authenticated users**, not admin) |
| `/report` | `ReportPage` | Protected (**all authenticated users**, not admin) |
| `/admin/users` | `UserManagementPage` | Admin (`AdminRoute`) |
| `/admin/settings` | `SettingsPage` | Admin (`AdminRoute`) |
| `/admin/audit-logs` | `AuditLogsPage` | Admin (`AdminRoute`) |
| `/admin/regions` | `RegionManagementPage` | Admin (`AdminRoute`) |
| `/admin/customer-codes` | `CustomerCodeManagementPage` | Admin (`AdminRoute`) |
| `/admin/coil-config` | `CoilConfigPage` | Admin (`AdminRoute`) |
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

### JSW Stock List feature (`src/components/jsw-stock/`, page `src/pages/jsw-stock/`)

**Non-admin** (`/jsw-stock`, nav item directly below Dashboard with the `Boxes` icon — in
`NAV_ITEMS`, not `ADMIN_NAV_ITEMS`). Server-driven browse of the daily SAP current-stock report,
mirroring the admin list pages but **read-only** (no create/edit/delete). Sortable `JswStockTable`
(Report Date · Party Code · Customer · **Customer Name** mapped · Sold To Party · Material · JSW
Grade · Sales Office · Distr.Chnl · Unrestr Qty · Stock Qty), `JswStockTableToolbar` — **exactly 5
filters**: a single **`DatePicker`** (shared component `src/components/common/DatePicker.tsx`, emits
a `"dd-MM-yyyy"` string | null, matched exactly against the backend `report_date` field — distinct
from `DateRangePicker`, which Audit Logs still uses) + an **inline `JswStockFilters`** group of
**4** backend async-select comboboxes via `searchJswStockFieldOptions(field)` →
`/jsw-stock/options?field=`: Order Type (`sales_order_type`), Customer (`customer_name`, the mapped
master name), Sales Office (`sales_office`), NCO (`nco_declared`). Rendered as a flat fragment
flowing into the same wrapping toolbar row — no "Filters" popover — with a trailing "Clear (N)"
button shown when any field is active. The free-text `q` search and `DateRangePicker` on `created_at`
were removed from this toolbar. `JswStockTablePagination`, and a premium centered
**`ViewJswStockDialog`** (shadcn `Dialog`, not a Sheet — tinted header with icon chip + customer +
status badges, a scrollable 2/3-col field grid, ingestion-provenance footer) showing **every stored
field** grouped (config-driven via `jsw-stock-fields.ts`). State in `hooks/useJswStockList.ts`.
Types in `src/types/jsw-stock/{stock,stock-ui}.ts`; API in `src/api/jsw-stock/{list,options}.ts`.
**Read-only-list contract notes:** the toolbar's `query` prop is typed `JswStockQueryState` (the 4
filter fields are `string`; `date` is `string|null`, seeded to today via
`format(new Date(),"dd-MM-yyyy")`). The hook exposes `setDate` (replaces the former `setDateRange`)
and strips empty/`null` before the API call (`buildQuery` skips `undefined`/`""` but NOT `null`).
Query keys are snake_case matching the backend. `FETCHERS` are frozen at module scope (referential
stability for `useAsyncOptions`). `JswStockField` covers the 4 filter field keys.

### JVML Stock List feature (`src/components/jvml-stock/`, page `src/pages/jvml-stock/`)

**Non-admin** (`/jvml-stock`, nav item directly below Dashboard — **above** JSW Stock List — with the
`Boxes` icon, in `NAV_ITEMS`). A **near-exact clone of the JSW Stock List** for the `JVML Stock (99).xlsx`
report, sharing the same read-only table/toolbar/pagination/view-dialog pattern. **Structurally
identical to JSW Stock List as of 2026-06-01** — the same **5-filter surface**: a single
`DatePicker` (`date: string|null`, seeded to today, exact match on `report_date`) + an inline
`JvmlStockFilters` group of **4** backend async-select comboboxes: Order Type (`sales_order_type`),
Customer (`customer_name`), Sales Office (`sales_office`), NCO (`nco_declared`). The former
`DateRangePicker`, free-text `q` search, and any count difference from JSW (previously "10 not 12")
are gone — both lists now share the same filter contract. `JvmlStockQueryState` now has `date:
string|null` + the 4 `string` filter fields; the hook exposes `setDate` (not `setDateRange`).
`jsw_grade` is a display/sort column but is no longer a filter field in this toolbar. Types
`src/types/jvml-stock/{stock,stock-ui}.ts`; API `src/api/jvml-stock/{list,options}.ts` →
`/jvml-stock` + `/jvml-stock/options`; state `hooks/useJvmlStockList.ts`; `JvmlStockFilters` keeps
its `FETCHERS` frozen at module scope. `JvmlStockField` covers the 4 filter field keys.

### Credit Report feature (`src/components/credit-report/`, page `src/pages/credit-report/`)

**Non-admin** (`/credit-report`, nav item below JSW Stock List, `CreditCard` icon, in `NAV_ITEMS`).
Server-driven browse of the daily SAP Credit Management report (`credit report.XLSX`), **filtered to the
JV0H / VJ0H control areas** at ingest. Read-only, same table/toolbar/pagination/view-dialog pattern as
the stock lists. **Filter surface:** the shared single-date `DatePicker` (`date: string|null`,
`"dd-MM-yyyy"`, seeded to today, exact match on `report_date`) + **6 filters** — 4 backend async-select
comboboxes (`customer_name`, `city`, `customer`, `cca_description` via
`searchCreditReportFieldOptions(field)` → `/credit-report/options?field=`, `FETCHERS` frozen at module
scope) + a **Blocked** `Select` (All / Blocked→`"X"` / Not blocked) + a **Credit Balance** `Select`
(All / Positive / Negative). No free-text `q`, no date-RANGE. `CreditReportTable` shows Report Date ·
Customer · Customer Name · City · CCA · CCA Description · Blocked(badge) · Credit Limit · Credit Exposure ·
Credit Balance · Overdue, with **INR `toLocaleString("en-IN")` formatting and sign coloring** (negative
red `text-destructive`, positive green `text-emerald`) on credit_balance/credit_exposure — "as it is in
Excel". `ViewCreditReportDialog` is config-driven (`credit-report-fields.ts`, adds a `"money"` FieldCell
kind). State `hooks/useCreditReportList.ts` (`setDate` + single `setFilter` for the 6 keys; no
`setSearch`/`setDateRange`). Types `src/types/credit-report/{credit-report,credit-report-ui}.ts`; API
`src/api/credit-report/{list,options}.ts`. **No customer-code mapping** (the file has a native
`Customer Name` column). Mutations/ingestion audited under the new `"credit_report"` category (blue
`AuditCategoryBadge`).

### Settings feature (`src/components/settings/`, page `src/pages/admin/settings/`)

**Admin-only** (`/admin/settings`, nav under "Administrator Config", `Settings` icon). Hosts the
**`JswStockConfigCard`** (zero props — owns `useJswStockConfig()` internally): `Switch` enable +
`base_path` / `file_name` (no extension; client regex `^[A-Za-z0-9_-]+$`) inputs + start/end
`type="time"` inputs + an interval `Select` (1–24h, value on the `<Select>` root) + the reused
**`EmailChipInput`** (`@/components/admin/regions/EmailChipInput`) for `notify_emails`, plus a "Run
check now" + "Save" footer and a `JswStockConfigStatus` panel (last run date/status/rows/error from
`/admin/jsw-stock/status`). API in `src/api/settings/jsw-stock-config/{get,update,status,runNow}.ts`
(`update.ts` uses the new `putData` client helper). Types in `src/types/settings/jsw-stock-config{,-ui}.ts`.
Mutations are audited backend-side under the new `"jsw_stock"` audit category (orange
`AuditCategoryBadge`). The Settings page also hosts a parallel **`JvmlStockConfigCard`** (rendered
above the JSW card) — an identical clone wired to `useJvmlStockConfig()` →
`/admin/jvml-stock/{config,status,run-now}`, audited under the `"jvml_stock"` category (cyan
`AuditCategoryBadge`). A third **`CreditReportConfigCard`** (→ `useCreditReportConfig()` →
`/admin/credit-report/{config,status,run-now}`, `credit_report` category) sits alongside them. All
three cards share the domain-agnostic `StockConfigPanel` driven by a `StockConfigDomain` descriptor in
`config-domains.ts` (`JSW_DOMAIN` / `JVML_DOMAIN` / `CREDIT_REPORT_DOMAIN`; `StockConfigDomain.key` is
`"jsw" | "jvml" | "credit_report"`). The page grid is `lg:grid-cols-2` — **2 cards per row, wrapping**
to the next row (a 3-across layout was rejected as too cramped).

### Coil Config feature (`src/components/admin/coil-prices/`, page `src/pages/admin/coil-config/`)

**Admin-only** (`/admin/coil-config`, nav under "Administrator Config" between Customer Codes and
Settings, `Disc3` icon). A deliberately **compact, card-based** page (not the full table-page
treatment) that hosts a single **`PerCoilPriceSection`** card — the "Per Coil Price" list. Each entry
is just `{ quantity, price }` (no coil name), unique per `quantity`, with an `active` flag. The card
shows a small server-driven `CoilPriceTable` (Quantity · Price · inline edit/delete icon actions; INR
`toLocaleString("en-IN")` display, "₹ " prefix, no unit suffix), a header `+ Add price` button, and
**Create/Edit/Delete** dialogs (`CreateCoilPriceDialog`/`EditCoilPriceDialog` mirror the Region
dialogs; delete is an inline `AlertDialog`). `useCoilPrices` fetches `sortBy=quantity&sortOrder=asc&limit=100`
(no pagination UI — the section is compact) and owns the delete mutation. Types in
`src/types/admin/coil-price{,-ui}.ts`; API in `src/api/admin/coil-prices/{list,create,update,remove}.ts`
→ `/admin/coil-prices`. Mutations are audited backend-side under the new `"coil_config"` audit category
(purple `AuditCategoryBadge`). Built to allow more config sections on the page later.

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
