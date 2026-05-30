# Adding a Frontend Feature/Domain

Step-by-step recipe for adding a new domain to the JSW Marketing Report Automation frontend. Mirrors the `auth` domain end-to-end. Governing skills: `frontend-structure-standards`, `frontend-api-standards`, `scaffold-standards`.

---

## Build Order

Follow this order. Each layer depends on the one above it; do not skip ahead.

| Step | Layer | Path pattern | Purpose |
|------|-------|-------------|---------|
| 1 | Types | `src/types/<domain>/` | Wire types, domain models, UI contracts |
| 2 | API | `src/api/<domain>/` | One file per endpoint; calls `client.ts` helpers |
| 3 | Store | `src/store/<domain>/slice.ts` + `selectors.ts` | Redux state only if domain needs global/shared state |
| 4 | Components | `src/components/<domain>/<feature>/` | Presentational; feature hook co-located under `hooks/` |
| 5 | Pages | `src/pages/<domain>/<route>/index.tsx` | Thin orchestrator; composes components, reads selectors |
| 6 | Route | `src/App.tsx` | Add `<Route>` inside the appropriate guard |

### Step 1 — Types (`src/types/<domain>/`)

- One file per boundary: wire types (`<domain>.ts`), session/state contract (`state.ts`), feature-UI contracts (`<feature>-ui.ts`).
- **No inline `interface Props` inside `.tsx` or hook files.** All custom types live here.
- Use `import type` for every type-only import (TS verbatimModuleSyntax is on).

Auth reference files:
```
src/types/auth/auth.ts        # LoginCredentials, AuthUser  (wire types)
src/types/auth/session.ts     # SessionUser, AuthState      (store contract)
src/types/auth/login-ui.ts    # UseLoginFormResult          (feature-UI contract)
```

### Step 2 — API (`src/api/<domain>/`)

- One file per endpoint (e.g. `list.ts`, `getById.ts`, `create.ts`).
- Import only from `@/api/client` — `getData`, `postData`, `getList`, `buildQuery`.
- Return the unwrapped domain type; `client.ts` handles envelope parsing and throws `ApiError` on failure.
- For paginated lists use `getList<T>` + `buildQuery`; never serialize params by hand.
- **No `fetch` calls inside components or hooks — ever.**

Auth reference:
```ts
// src/api/auth/login.ts
import { postData } from "@/api/client"
import type { AuthUser, LoginCredentials } from "@/types/auth/auth"

export function login(credentials: LoginCredentials): Promise<AuthUser> {
  return postData<AuthUser>("/auth/login", credentials)
}
```

For a list endpoint add `page`, `limit`, `sortBy`, `sortOrder`, `q`, and domain filters as a typed query object; pass through `buildQuery`.

### Step 3 — Store (`src/store/<domain>/`)

Only add a Redux slice when state must be **global or shared** (auth, cached server data, configuration). Local UI state stays in hooks.

Two files mirror the auth pattern:

```
src/store/<domain>/slice.ts       # createSlice; import state type from types/<domain>/
src/store/<domain>/selectors.ts   # one selector per field; import RootState from @/app/store
```

After creating the slice, register it in `src/app/store.ts`:
```ts
import <domain>Reducer from "@/store/<domain>/slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    <domain>: <domain>Reducer,   // add here
  },
})
```

### Step 4 — Components (`src/components/<domain>/<feature>/`)

Structure:
```
src/components/<domain>/<feature>/
  <FeatureName>.tsx              # presentational, no fetch, no inline types
  hooks/
    use<FeatureName>.ts          # all logic; returns typed contract from types/<domain>/<feature>-ui.ts
```

Rules:
- Hook uses `useAppDispatch` / `useAppSelector` (never raw `useDispatch` / `useSelector`).
- Component destructures the hook result — no logic of its own.
- Styling: Tailwind utilities first; CSS Modules only for keyframes, complex selectors, or feature-local skins. Semantic tokens only (`--primary`, `--destructive`, etc.); no raw hex; contrast ≥ 4.5:1.
- Extend from `src/components/ui/*` (shadcn primitives) — do not fork Radix directly.
- File limit: **250 lines max**. Split into subcomponents or extract helpers when approaching the limit.

### Step 5 — Pages (`src/pages/<domain>/<route>/index.tsx`)

- Thin orchestrator only: read selectors, guard redirects, compose feature components.
- No business logic, no fetch calls.

Auth reference:
```ts
// src/pages/auth/login/index.tsx — 17 lines total
import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated } from "@/store/auth/selectors"
import { LoginForm } from "@/components/auth/login/LoginForm"
```

### Step 6 — Route (`src/App.tsx`)

Add a `<Route>` under the appropriate guard. Protected routes nest inside `<Route element={<ProtectedRoute />}>`.

```tsx
// src/App.tsx (excerpt)
import { ReportsPage } from "@/pages/reports/list"
// ...
<Route element={<ProtectedRoute />}>
  <Route path="/reports" element={<ReportsPage />} />
</Route>
```

---

## Worked Example — `reports` Domain

A paginated report list screen.

### Files to create

```
src/types/reports/report.ts          # Report wire type, ReportListQuery
src/types/reports/reports-list-ui.ts # UseReportsListResult

src/api/reports/list.ts              # getList<Report> + buildQuery

src/store/reports/slice.ts           # reportsSlice (if caching needed)
src/store/reports/selectors.ts

src/components/reports/list/
  ReportsList.tsx
  hooks/
    useReportsList.ts

src/pages/reports/list/index.tsx     # /reports route component
```

### Key type shapes

```ts
// src/types/reports/report.ts
export interface Report {
  id: string
  title: string
  createdAt: string
}

export interface ReportListQuery {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
  q?: string
}
```

```ts
// src/api/reports/list.ts
import { getList, buildQuery } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { Report, ReportListQuery } from "@/types/reports/report"

export function listReports(query: ReportListQuery): Promise<PaginatedResult<Report>> {
  return getList<Report>(`/reports${buildQuery(query)}`)
}
```

```ts
// src/types/reports/reports-list-ui.ts
import type { PaginatedResult } from "@/types/api/envelope"
import type { Report, ReportListQuery } from "@/types/reports/report"

export interface UseReportsListResult {
  reports: Report[]
  meta: PaginatedResult<Report>["meta"] | null
  query: ReportListQuery
  isLoading: boolean
  error: string | null
  setQuery: (patch: Partial<ReportListQuery>) => void
}
```

Hook calls `listReports`, stores result locally (or in Redux if cross-screen caching is needed). Page resets to `1` whenever `q`, `sortBy`, or domain filters change — never filter server data client-side.

### Route registration

```tsx
import { ReportsPage } from "@/pages/reports/list"
// inside <Route element={<ProtectedRoute />}>:
<Route path="/reports" element={<ReportsPage />} />
```

---

## Checklist

Before marking a domain complete, verify every item.

| # | Rule | Source |
|---|------|--------|
| 1 | No API calls (`fetch`, `postData`, etc.) inside any component or page file | `frontend-structure-standards` §6 |
| 2 | All custom types live in `src/types/<domain>/`; no inline `interface Props` in `.tsx` | `frontend-structure-standards` §4 |
| 3 | State accessed only via selectors from `src/store/<domain>/selectors.ts` | `frontend-structure-standards` §7 |
| 4 | Typed Redux hooks only: `useAppDispatch` / `useAppSelector` from `@/app/hooks` | `frontend/CLAUDE.md` |
| 5 | No file exceeds 250 lines | `frontend-structure-standards` §12 |
| 6 | No client-side filtering, sorting, or pagination of server data | `frontend-api-standards` non-negotiables |
| 7 | List endpoints use `getList` + `buildQuery`; query params match backend contract (`page`, `limit`, `sortBy`, `sortOrder`, `q`) | `frontend-api-standards` |
| 8 | Styling uses semantic design tokens only (`--primary`, `--destructive`, etc.); no raw hex; contrast ≥ 4.5:1 | `frontend-structure-standards` §3 |
| 9 | Tailwind v4 patterns only — no `tailwind.config.js`, no v3 `@apply` patterns | `frontend/CLAUDE.md` |
| 10 | `import type` for every type-only import (TS verbatimModuleSyntax) | `frontend/CLAUDE.md` stack |
| 11 | New slice registered in `src/app/store.ts` | `frontend-structure-standards` §7 |
| 12 | Route page is a thin orchestrator (< 30 lines is typical); heavy UI lives in `components/` | `frontend-structure-standards` §3 |
