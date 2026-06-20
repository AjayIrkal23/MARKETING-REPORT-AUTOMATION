<!-- dox:child v1 -->
# `frontend/src/` — React application source

All Vite + React + TypeScript source for the JSW Marketing Report Automation
dashboard. Entry point is `main.tsx`; routing lives in `App.tsx`.

## What lives here

| Dir | Responsibility |
|-----|----------------|
| `app/` | Redux store config + typed hooks (`useAppDispatch` / `useAppSelector`) |
| `features/` | Redux slices (currently only `auth`) |
| `store/` | Additional store slices if needed |
| `api/` | Per-domain API modules; all backend calls go through here |
| `lib/` | Shared utilities (`api.ts` client, `utils.ts` `cn()` helper) |
| `components/` | React components, grouped by domain; `ui/` holds shadcn primitives |
| `pages/` | Top-level route pages; `admin/` for admin-only screens |
| `routes/` | Route guards (`ProtectedRoute`, `AdminRoute`) |
| `types/` | Domain TypeScript types — never scatter types across components |
| `hooks/` | Shared custom hooks |
| `styles/` | Global styles / CSS additions |
| `public/` | Static assets (sibling dir, not under `src/`) |

## Local conventions

- **No client-side filtering** of server data — all filter/sort/pagination goes to the API.
- **API calls live in `api/` or `lib/api.ts`** — never call `fetch` directly from components.
- Domain types live in `types/<domain>/`; create the folder when adding a new domain.
- Use typed Redux hooks (`useAppDispatch` / `useAppSelector`) everywhere.
- Use shadcn/ui semantic tokens (`--primary`, `--destructive`, etc.); JSW brand tokens
  are not yet defined.
- No file > 250 lines; split components at > 200 lines.
- Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`.

## Key files

| File | Role |
|------|------|
| `main.tsx` | React entry point |
| `App.tsx` | Router setup: public `/login`, protected `/home`, admin `/admin/*` |
| `index.css` | shadcn oklch tokens + Geist font + JSW brand colors |
| `lib/api.ts` | Centralized backend client (enveloped JSON) |
| `app/store.ts` | Redux store |
| `app/hooks.ts` | Typed dispatch/selector hooks |

## Gotchas / fragile spots

- The frontend is under active construction. Verify the live `src/` tree with
  `ctx_tree frontend/src 4` before relying on docs for feature completeness.
- `src/lib/api.ts` only handles enveloped JSON. Multipart uploads and binary downloads
  use raw `fetch` in their dedicated `api/` modules — this is intentional.
- Auth is currently mock: any non-empty credentials are accepted.

## Features

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


## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`api/`](api/CLAUDE.md) · [`app/`](app/CLAUDE.md) · [`components/`](components/CLAUDE.md) · [`features/`](features/CLAUDE.md) · [`hooks/`](hooks/CLAUDE.md) · [`lib/`](lib/CLAUDE.md) · [`pages/`](pages/CLAUDE.md) · [`routes/`](routes/CLAUDE.md) · [`store/`](store/CLAUDE.md) · [`styles/`](styles/CLAUDE.md) · [`types/`](types/CLAUDE.md)
- Related repo docs: [`frontend_docs/README.md`](../../frontend_docs/README.md)
