# Frontend Routing

React Router DOM v7 setup for the JSW Marketing Report Automation dashboard. Covers the route table, `ProtectedRoute` guard, page-file conventions, and how to add new routes.

Governing skills: **`frontend-structure-standards`**, **`frontend-standards-always-follow`**.

---

## Route Table

| Path | Component | Guard | Behaviour |
|------|-----------|-------|-----------|
| `/login` | `LoginPage` | Public | Redirects to `/home` if already authenticated |
| `/home` | `HomePage` | `ProtectedRoute` | Protected dashboard landing |
| `/` | `<Navigate to="/home" replace />` | `ProtectedRoute` | Alias; redirects to `/home` |
| `*` | `<Navigate to="/home" replace />` | None | Catch-all fallback |

---

## App.tsx wiring

`src/App.tsx` is the single routing root. It mounts `BrowserRouter`, declares all routes, and composes `ProtectedRoute` as a layout route wrapping guarded paths.

```tsx
// src/App.tsx (full file — 20 lines, verified on disk)
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { LoginPage } from "@/pages/auth/login"
import { HomePage } from "@/pages/dashboard/home"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

Key points:

- `ProtectedRoute` is used as a **pathless layout route** (`<Route element={<ProtectedRoute />}>`). All children nested inside it are protected.
- The catch-all `path="*"` sits **outside** the guard so unauthenticated users hitting unknown paths are redirected to `/home`, which then triggers the guard redirect to `/login`.
- `BrowserRouter` is declared here only — do not add a second router in tests or wrappers.

---

## ProtectedRoute

File: `src/routes/ProtectedRoute.tsx`

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated } from "@/store/auth/selectors"

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
```

Behaviour:

- Reads `auth.isAuthenticated` via `selectIsAuthenticated` — a typed selector in `src/store/auth/selectors.ts`. Never read `state.auth` inline in route files.
- Uses the typed hook `useAppSelector` from `src/app/hooks.ts`. Raw `useSelector` is prohibited.
- Passes `state={{ from: location }}` on redirect so `/login` can send the user back to the page they originally requested.
- Renders `<Outlet />` when authenticated, allowing child routes to render normally.

Auth state source:

| Concern | Location |
|---------|----------|
| Slice (actions + reducer) | `src/store/auth/slice.ts` — `loginSuccess`, `logout` |
| Selectors | `src/store/auth/selectors.ts` — `selectIsAuthenticated`, `selectSessionUser`, `selectAuthToken` |
| localStorage keys | `app.auth.token`, `app.auth.user` (hydrated on store init) |
| Auth type contracts | `src/types/auth/session.ts` (`AuthState`, `SessionUser`) |

> **Mock auth note (documented decision, not a bug):** any non-empty username + password pair is accepted and returns `"dev-token"`. No real `/auth/login` call is made yet. The API module `src/api/auth/login.ts` exists for when real auth is wired.

---

## Route parents — `pages/<domain>/<route>/index.tsx`

Per `frontend-structure-standards`, every route entry parent lives at:

```
src/pages/<domain>/<route>/index.tsx
```

The page file is a **thin orchestrator**: it reads auth state and composes feature UI components from `src/components/<domain>/<feature>/`. It does not own heavy JSX trees, inline types, or API calls.

Current route pages on disk:

| Route | File | Composes |
|-------|------|----------|
| `/login` | `src/pages/auth/login/index.tsx` | `LoginForm` from `src/components/auth/login/LoginForm.tsx` |
| `/home` | `src/pages/dashboard/home/index.tsx` | Scaffold placeholder only |

`LoginPage` example — shows the correct thin-orchestrator pattern:

```tsx
// src/pages/auth/login/index.tsx
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  if (isAuthenticated) return <Navigate to="/home" replace />

  return (
    <div className="bg-background grid min-h-svh place-items-center p-6">
      <LoginForm />
    </div>
  )
}
```

Rules enforced by the governing skills:

- No API calls in page files — API calls belong in `src/api/<domain>/` modules.
- No inline `interface Props` or type declarations — types live in `src/types/<domain>/`.
- Files must stay at or below **250 lines**; split into subcomponents or hooks if exceeded.
- Use semantic design tokens only (`--primary`, `--background`, `--muted-foreground`, etc.) — no raw hex; contrast ratio ≥ 4.5:1.
- Use typed Redux hooks (`useAppSelector`, `useAppDispatch`) — never raw `useSelector`/`useDispatch`.

---

## Adding a route

Follow these steps exactly. Do not skip file creation or reuse an existing page file for a different domain.

**1. Create the page file.**

```
src/pages/<domain>/<route>/index.tsx
```

Export a named function component (PascalCase). The file is a thin orchestrator — compose from `src/components/<domain>/<feature>/`. Keep it under 250 lines.

**2. Create feature UI under components.**

```
src/components/<domain>/<feature>/FeatureComponent.tsx
src/components/<domain>/<feature>/hooks/useFeatureState.ts   # if stateful
```

**3. Add the route to `App.tsx`.**

- Public route: add a `<Route path="/<path>" element={<YourPage />} />` **outside** the `ProtectedRoute` block.
- Protected route: add it **inside** the `<Route element={<ProtectedRoute />}>` block.

```tsx
// protected example
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Navigate to="/home" replace />} />
  <Route path="/home" element={<HomePage />} />
  <Route path="/reports" element={<ReportsPage />} />  {/* new */}
</Route>
```

**4. Add the page export to the domain index if one exists.**

If `src/pages/<domain>/` already has a barrel `index.ts`, add the export there.

**5. Add types for any new domain.**

```
src/types/<domain>/<feature>-ui.ts   # component props, local state shapes
src/types/<domain>/<model>.ts        # domain model / API contract
```

Never declare `interface Props` or domain types inline in `.tsx` files.

**6. Add API module if the route fetches data.**

```
src/api/<domain>/<verb>.ts   # e.g. src/api/reports/list.ts
```

Wire through `src/api/client.ts` helpers (`getData`, `postData`, `getList`). No `fetch` calls in components or pages.
