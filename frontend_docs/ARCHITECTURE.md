# Frontend Architecture

JSW Marketing Report Automation — Vite + React dashboard. This doc is the reference for AI coding agents and human developers; every path and symbol cited below has been verified on disk.

Governing skills: `frontend-structure-standards`, `frontend-api-standards`.

---

## Stack

| Layer | Technology |
|---|---|
| Build | Vite 8, `@vitejs/plugin-react` |
| UI framework | React 19, TypeScript ~6 (`verbatimModuleSyntax` — use `import type` for type-only imports) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` — **no `tailwind.config.js`** |
| Components | shadcn/ui (~55 vendored primitives in `src/components/ui/`) |
| State | Redux Toolkit 2 + react-redux 9 |
| Routing | react-router-dom 7 |
| Theming | next-themes (`ThemeProvider`) |
| Path alias | `@` → `src/` (configured in `vite.config.ts`) |

---

## Layers

```
src/
├── api/                  # Transport layer — only place fetch() is called
│   ├── client.ts         # Base: getData / postData / getList / buildQuery / ApiError
│   ├── auth/login.ts     # POST /auth/login
│   ├── meta/health.ts    # GET /health
│   ├── meta/ping.ts      # GET /ping
│   └── user/list.ts      # GET /users
│
├── app/
│   ├── store.ts          # configureStore({ auth: authReducer }) → RootState, AppDispatch
│   └── hooks.ts          # useAppDispatch / useAppSelector (typed — use these, never raw)
│
├── store/
│   └── auth/
│       ├── slice.ts      # loginSuccess / logout; localStorage-hydrated on init
│       └── selectors.ts  # selectIsAuthenticated / selectSessionUser / selectAuthToken
│
├── types/                # ALL app-owned types live here — never inline inside .tsx files
│   ├── api/
│   │   ├── envelope.ts   # ApiSuccess<T>, PaginatedResult<T>, PaginationMeta, PageQuery
│   │   └── error.ts      # ApiErrorBody, ApiErrorEnvelope
│   ├── auth/
│   │   ├── auth.ts       # AuthUser, LoginCredentials
│   │   ├── session.ts    # AuthState, SessionUser
│   │   └── login-ui.ts   # UseLoginFormResult (feature UI contract)
│   ├── meta/meta.ts
│   ├── theme/theme.ts
│   └── user/user.ts
│
├── components/           # Feature UI — compose presentational + feature-shell components
│   ├── auth/login/
│   │   ├── LoginForm.tsx
│   │   └── hooks/useLoginForm.ts   # feature-owned hook; dispatches loginSuccess
│   ├── theme/theme-provider.tsx    # ThemeProvider wrapper
│   └── ui/                         # shadcn/ui — VENDORED; do not restructure
│
├── pages/                # Route entries — thin orchestrators; no heavy logic
│   ├── auth/login/index.tsx        # /login → LoginPage
│   └── dashboard/home/index.tsx   # /home  → HomePage
│
├── routes/
│   └── ProtectedRoute.tsx          # reads selectIsAuthenticated; redirects → /login
│
├── hooks/
│   └── use-mobile.ts               # shared (shadcn sidebar dep) — do not move
│
├── styles/README.md
├── lib/utils.ts          # cn() — imported by 51 ui files; do NOT move
├── App.tsx               # BrowserRouter + Routes
├── main.tsx              # StrictMode > Provider > ThemeProvider > TooltipProvider > App
└── index.css             # Tailwind import + shadcn oklch tokens (:root / .dark) + Geist font
```

### Layer rules (from `frontend-structure-standards`)

| Rule | Detail |
|---|---|
| No API calls in components | All `fetch` calls are in `src/api/**` only |
| Type ownership | `src/types/<domain>/` — no inline `interface Props` in `.tsx` files |
| Domain isolation | One domain per folder; do not mix domains |
| Page vs component split | `pages/<domain>/<route>/index.tsx` orchestrates; UI lives in `components/<domain>/<feature>/` |
| Feature-owned hooks | `components/<domain>/<feature>/hooks/use*.ts` when used by that feature only |
| File size limit | **≤ 250 lines** per manually maintained source file; split at ≥ 200 |
| CSS escape hatch | Feature-local CSS Modules for pseudo-elements / keyframes; Tailwind utilities for layout/spacing |

---

## Data Flow

```
page (pages/auth/login/index.tsx)
  └── renders → LoginForm (components/auth/login/LoginForm.tsx)
                  └── calls → useLoginForm (hooks/useLoginForm.ts)
                                ├── useAppDispatch / useAppSelector  (app/hooks.ts)
                                └── [future] login()  (api/auth/login.ts)
                                      └── postData("/auth/login", creds)  (api/client.ts)
                                            └── fetch(`${BASE_URL}/auth/login`)
                                                  └── FastAPI :8000/auth/login
                                                        └── returns { success, data: AuthUser, message }
                                            ApiError thrown on success:false or non-2xx
```

**Envelope contract** (types mirrored from backend, defined in `src/types/api/`):

```ts
// success
{ success: true, data: T, message: string, meta?: PaginationMeta }

// error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

**List queries** — use `buildQuery(params)` + `getList<T>()` in the domain api module; never filter/paginate/sort server data in the browser. Required query shape:

```ts
{ page, limit, sortBy, sortOrder, q, ...domainFilters }
```

`page` resets to `1` when filters or search change. Totals come from `meta.total` / `meta.totalPages` only.

---

## Cross-cutting

### Auth session

- `store/auth/slice.ts` — `loginSuccess` writes `user` + `token` to `localStorage` (keys `app.auth.token`, `app.auth.user`); `logout` clears them.
- `loadInitialState()` rehydrates from `localStorage` on store init — session survives page reload.
- `ProtectedRoute` reads `selectIsAuthenticated`; unauthenticated requests are redirected to `/login` with `state.from` so post-login redirect works.
- **Mock auth (intentional):** `useLoginForm` currently dispatches `loginSuccess` with `token: "dev-token"` for any non-empty credentials. The real `login()` module (`src/api/auth/login.ts`) is wired but not yet called. Swap the TODO comment in `useLoginForm.ts` when the backend auth endpoint is ready.

### Routing

| Path | Component | Guard |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/home` | `HomePage` | `ProtectedRoute` |
| `/` | Redirect → `/home` | via `ProtectedRoute` |
| `*` | Redirect → `/home` | — |

### Theming

- `ThemeProvider` (`components/theme/theme-provider.tsx`) wraps the root — light/dark via `next-themes`.
- Tokens live in `src/index.css` under `:root` / `.dark` as `oklch` CSS custom properties (`--primary`, `--destructive`, `--sidebar`, `--color-chart-*`, Geist font, etc.).
- **JSW brand tokens (`--jsw-blue`, `--jsw-red`, `--jsw-steel`) are not yet defined.** Add them to `index.css` before use.
- Always use semantic tokens in components — no raw hex values; contrast ≥ 4.5:1.

### Provider tree (`main.tsx`)

```
StrictMode
  Provider (Redux store)
    ThemeProvider
      TooltipProvider (delayDuration=200)
        App (BrowserRouter + Routes)
        Toaster (sonner, richColors, top-right)
```

---

## Build & Dev

| Command | Output |
|---|---|
| `npm run dev` | Vite dev server → `http://localhost:5173` |
| `npm run build` | `tsc -b && vite build` (currently GREEN — 0 type errors) |
| `npm run lint` | `eslint .` — 12 pre-existing errors in `components/ui/` + `hooks/use-mobile.ts` (vendored; out of scope) |
| `npm run preview` | Vite preview → `http://localhost:4173` |

**Vite dev proxy** (`vite.config.ts`):

```ts
"/api": { target: "http://localhost:8000", changeOrigin: true, rewrite: p => p.replace(/^\/api/, "") }
```

All `fetch("/api/...")` calls in dev are forwarded to FastAPI on `:8000` with the `/api` prefix stripped.

**Override for non-dev environments:**

```bash
VITE_API_URL=http://staging.example.com  npm run build
```

`api/client.ts` reads `import.meta.env.VITE_API_URL`; falls back to `"/api"` when unset.
