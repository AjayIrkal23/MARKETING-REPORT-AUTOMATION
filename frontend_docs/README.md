# Frontend Docs Index

Orientation hub for the JSW Marketing Report Automation frontend. All paths, symbols, and rules below are verified against the live `src/` tree as of 2026-05-30. Governing skills: `frontend-standards-always-follow`, `frontend-structure-standards`.

---

## Overview

Vite + React dashboard for the JSW Steel West-Central region marketing tooling. Auth and routing are wired; domain screens (credit, stock, customer views) do not yet exist. The app proxies `/api/*` to the FastAPI backend on port 8000.

Current state: **scaffold** — green build (`tsc -b && vite build`), mock auth (any non-empty credentials), one protected route (`/home`), and the full shadcn/ui primitive set available for domain work.

---

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Build | Vite 8 | `@vitejs/plugin-react` |
| UI framework | React 19.2 | |
| Language | TypeScript ~6.0 | `verbatimModuleSyntax` on — use `import type` for type-only imports |
| Styling | Tailwind CSS v4 | `@tailwindcss/vite` plugin; **no `tailwind.config.js`** |
| Component library | shadcn/ui (~65 primitives) | Vendored in `src/components/ui/`; do not restructure |
| State | Redux Toolkit 2 + react-redux 9 | |
| Routing | react-router-dom 7 | |
| Charts | recharts 3 | |
| Icons | lucide-react | |
| Toasts | sonner | |
| Theming | next-themes | `ThemeProvider` in `src/components/theme/theme-provider.tsx` |
| Date utils | date-fns 4 | |
| Font | Geist Variable (`@fontsource-variable/geist`) | Loaded in `src/index.css` |

---

## Doc Map

| Doc | Covers |
|---|---|
| `frontend_docs/README.md` *(this file)* | Orientation, stack, quick start, golden rules |
| `frontend/CLAUDE.md` | Agent surface guide: routing table, state, theming, API access, mandatory rules |
| `frontend/README.md` | Brief stack summary and run commands |
| `frontend/src/styles/README.md` | CSS layering model: global shell / domain-shared / CSS Modules |

---

## Quick Start

```bash
cd frontend
npm install
npm run dev        # dev server → http://localhost:5173  (/api/* → :8000)
npm run build      # tsc -b && vite build → dist/
npm run lint       # eslint .
npm run preview    # vite preview → http://localhost:4173
```

Override backend URL: `VITE_API_URL=http://...` (see `vite.config.ts`).

---

## `src/` Layout

```
src/
  api/
    client.ts                    # base fetch + ApiError + getData/postData/getList/buildQuery
    auth/login.ts                # POST /auth/login
    meta/health.ts               # GET /health
    meta/ping.ts                 # GET /ping
    user/list.ts                 # GET /users
  app/
    store.ts                     # configureStore, reducer: { auth }
    hooks.ts                     # useAppDispatch / useAppSelector (typed)
  components/
    auth/login/
      LoginForm.tsx
      hooks/useLoginForm.ts
    theme/theme-provider.tsx
    ui/                          # shadcn primitives — VENDORED, do not restructure
  hooks/
    use-mobile.ts                # shadcn shared hook (used by ui/sidebar)
  lib/
    utils.ts                     # cn() — imported by 51+ ui files, do NOT move
  pages/
    auth/login/index.tsx         # /login
    dashboard/home/index.tsx     # /home
  routes/
    ProtectedRoute.tsx
  store/
    auth/slice.ts                # loginSuccess / logout, localStorage-hydrated
    auth/selectors.ts
  styles/
    README.md                    # CSS layering rules
  types/
    api/envelope.ts              # ApiSuccess, PaginationMeta, PageQuery, PaginatedResult
    api/error.ts                 # ApiErrorBody
    auth/auth.ts
    auth/session.ts
    auth/login-ui.ts
    meta/meta.ts
    theme/theme.ts
    user/user.ts
  App.tsx
  index.css                      # Tailwind import + shadcn oklch tokens + Geist font
  main.tsx
```

### Routes

| Path | Page file | Guard |
|---|---|---|
| `/login` | `pages/auth/login/index.tsx` | Public |
| `/home` | `pages/dashboard/home/index.tsx` | `ProtectedRoute` |
| `/` | redirect → `/home` | — |
| `*` | redirect → `/home` | — |

**Mock auth** (documented decision, not a bug): `api/auth/login.ts` accepts any non-empty credentials and returns `"dev-token"`. Replace with a real API call when auth is implemented.

---

## API Layer

All backend calls flow through `src/api/client.ts`. Domain modules (`api/<domain>/*.ts`) call the helpers below — never raw `fetch`.

| Helper | Signature | Use for |
|---|---|---|
| `getData<T>` | `(path) => Promise<T>` | Single-resource GET |
| `postData<T>` | `(path, body) => Promise<T>` | POST with JSON body |
| `getList<T>` | `(path) => Promise<PaginatedResult<T>>` | Paginated list GET |
| `buildQuery` | `(params) => string` | Build `?key=val` query strings |
| `ApiError` | `class` | Thrown on any non-success response; carries `.code`, `.status`, `.details` |

Backend envelope contract (from `types/api/envelope.ts`):

```ts
// success
{ success: true, data: T, message: string, meta?: PaginationMeta | null }

// error — thrown as ApiError
{ success: false, error: { code: string, message: string, details?: unknown } }
```

Pagination defaults: `page=1`, `limit=20`, max `100`; `sortBy`/`sortOrder` from server whitelist.

---

## Theming and CSS

`src/index.css` owns: Tailwind import, shadcn oklch design tokens (`:root`/`.dark`), Geist font face. No feature selectors go here.

Design tokens to use now: `--primary`, `--destructive`, `--muted`, `--sidebar`, `--color-chart-*`.

**JSW brand tokens (`--jsw-blue`, `--jsw-red`, `--jsw-steel`) are not yet defined.** Add to `index.css` before referencing them. Never use raw hex in components.

CSS ownership layers:

| Layer | Location |
|---|---|
| Global | `src/index.css` (Tailwind + tokens + font only) |
| Domain-shared | `src/styles/<domain>/index.css` (none exist yet) |
| Feature-local | `src/components/<domain>/<feature>/*.module.css` (CSS Modules) |

---

## Golden Rules

These are the non-negotiables enforced by `frontend-standards-always-follow` and `frontend-structure-standards` via global hooks.

| Rule | Detail |
|---|---|
| No API calls in components | All `fetch` goes through `src/api/client.ts` helpers; domain modules in `src/api/<domain>/` |
| No client-side filtering | Never filter/sort/paginate server data in the browser; send query params to the API |
| Types in `src/types/<domain>/` | No inline `interface Props` or custom types inside `.tsx` files; import from `src/types/` |
| File size <= 250 lines | Any manually maintained file over 250 lines must be split before adding behavior |
| Typed Redux hooks only | `useAppDispatch` / `useAppSelector` from `src/app/hooks.ts`; never raw `useDispatch` / `useSelector` |
| Tailwind v4, no config file | Use `@tailwindcss/vite`; there is no `tailwind.config.js` |
| shadcn is vendored | Extend from `src/components/ui/`; do not restructure or fork Radix primitives directly |
| Route page vs feature UI | Route entry: `pages/<domain>/<route>/index.tsx`; feature UI: `components/<domain>/<feature>/*` |
| Feature hooks co-located | Feature-only hooks live in `components/<domain>/<feature>/hooks/`; shared hooks in `hooks/` |
| Contrast >= 4.5:1 | All text/background pairs must meet WCAG AA; use semantic tokens, not raw hex |
| 12 pre-existing ESLint errors | Live only in `components/ui/*` + `hooks/use-mobile.ts` (vendored, out of scope — do not fix) |
| `lib/utils.ts` is immovable | `cn()` is imported by 51+ ui files; do not move or rename this file |
