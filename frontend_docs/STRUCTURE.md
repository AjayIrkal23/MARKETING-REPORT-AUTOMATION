# Frontend Folder Structure

Canonical domain-based layout for the JSW Marketing Report Automation Vite + React dashboard. Governs where every kind of file lives. Applies the rules from **`frontend-structure-standards`** and **`frontend-standards-always-follow`**.

---

## Canonical src/ Tree

```
src/
├── api/                          # Backend HTTP layer — NO fetch inside components
│   ├── client.ts                 # Base transport: getData/postData/getList/buildQuery + ApiError
│   ├── auth/
│   │   └── login.ts              # POST /auth/login
│   ├── meta/
│   │   ├── health.ts             # GET /health
│   │   └── ping.ts               # GET /ping
│   └── user/
│       └── list.ts               # GET /users
│
├── app/                          # Redux store wiring
│   ├── store.ts                  # configureStore — reducer: { auth }
│   └── hooks.ts                  # useAppDispatch / useAppSelector (typed, use these always)
│
├── components/                   # Feature UI — decomposed from pages
│   ├── auth/
│   │   └── login/
│   │       ├── LoginForm.tsx     # UI only; no direct fetch
│   │       └── hooks/
│   │           └── useLoginForm.ts  # Feature-local hook (state + submit logic)
│   ├── theme/
│   │   └── theme-provider.tsx    # next-themes ThemeProvider wrapper
│   └── ui/                       # shadcn/ui primitives — VENDORED (see below)
│       └── *.tsx                 # ~55 components; do not restructure
│
├── hooks/                        # Shared hooks (used across multiple features)
│   └── use-mobile.ts             # shadcn shared hook; used by ui/sidebar — VENDORED
│
├── lib/                          # Vendored utility — do not move
│   └── utils.ts                  # cn() — imported by all 55 ui/* files
│
├── pages/                        # Route entry parents — thin orchestrators only
│   ├── auth/
│   │   └── login/
│   │       └── index.tsx         # /login route
│   └── dashboard/
│       └── home/
│           └── index.tsx         # /home route (ProtectedRoute)
│
├── routes/
│   └── ProtectedRoute.tsx        # Reads auth.isAuthenticated; redirects to /login
│
├── store/                        # Redux slices — one domain per folder
│   └── auth/
│       ├── slice.ts              # loginSuccess / logout; localStorage-hydrated
│       └── selectors.ts         # selectIsAuthenticated, selectUser, etc.
│
├── styles/
│   └── README.md                 # Style ownership guide (domain CSS goes here when needed)
│
├── types/                        # ALL app-owned types — no inline interface/type in .tsx
│   ├── api/
│   │   ├── envelope.ts           # ApiSuccess, PaginationMeta, PageQuery, PaginatedResult
│   │   └── error.ts              # ApiErrorBody
│   ├── auth/
│   │   ├── auth.ts               # Auth domain model
│   │   ├── session.ts            # AuthState, SessionUser
│   │   └── login-ui.ts           # LoginForm props / UI state contract
│   ├── meta/
│   │   └── meta.ts               # HealthResponse, PongResponse
│   ├── theme/
│   │   └── theme.ts              # Theme type
│   └── user/
│       └── user.ts               # User domain model
│
├── App.tsx                       # Router, ThemeProvider, route tree
├── main.tsx                      # React DOM root
└── index.css                     # Tailwind @import + shadcn oklch tokens + Geist font
```

---

## Where Things Go

| Concern | Path | Rule |
|---|---|---|
| Base HTTP transport | `api/client.ts` | Single fetch call site; domain modules import helpers from here |
| Domain API call (one per file) | `api/<domain>/<verb>.ts` | e.g. `api/auth/login.ts`, `api/user/list.ts` |
| Redux store config | `app/store.ts` | All reducers registered here |
| Typed Redux hooks | `app/hooks.ts` | Always `useAppDispatch`/`useAppSelector`; never raw hooks |
| Route entry parent | `pages/<domain>/<route>/index.tsx` | Thin orchestrator — composes feature components |
| Feature UI | `components/<domain>/<feature>/*.tsx` | UI logic extracted from pages |
| Feature-local hook | `components/<domain>/<feature>/hooks/use*.ts` | Used only by that feature |
| Shared hook (multi-feature) | `hooks/<domain>/use*.ts` | Promoted when reused across features |
| Redux slice | `store/<domain>/slice.ts` | One domain per slice; no UI logic |
| Redux selectors | `store/<domain>/selectors.ts` | Only way to read store state in components |
| App-owned types | `types/<domain>/*.ts` | All `type`/`interface` declarations live here |
| Feature UI state contract | `types/<domain>/<feature>-ui.ts` | Props, dialog state, form state |
| API envelope contracts | `types/api/envelope.ts` | `ApiSuccess`, `PaginationMeta`, `PaginatedResult` |
| Route guard | `routes/ProtectedRoute.tsx` | Auth check; redirect if not authenticated |
| Global CSS | `index.css` | Tailwind import + shadcn tokens + Geist font — nothing else |
| Domain shared CSS (future) | `styles/<domain>/index.css` | Non-module, domain-scoped overrides |
| Feature-local CSS | `components/<domain>/<feature>/*.module.css` | Pseudo-elements, keyframes, complex selectors |

---

## Domain vs Feature vs Route

```
pages/<domain>/<route>/index.tsx      ← route entry; orchestrates, does not own heavy JSX
components/<domain>/<feature>/*.tsx   ← feature UI owned here; imported by pages
components/<domain>/<feature>/hooks/  ← hooks used only by this feature
hooks/<domain>/                       ← hooks shared across >=2 features
store/<domain>/slice.ts + selectors   ← global state for this domain
types/<domain>/                       ← all type contracts for this domain
api/<domain>/                         ← all backend calls for this domain
```

**Key splits:**
- A page (`pages/`) may import multiple feature components but must not own large JSX trees itself.
- A feature component (`components/`) must not call `fetch` or dispatch to a Redux thunk directly — use a feature hook or a store action.
- Types are never declared inline in `.tsx`/`.ts` implementation files — always in `types/<domain>/`.

---

## Vendored shadcn (do not restructure)

These paths are owned by shadcn/ui tooling. Do not move, rename, or restructure them:

| Path | What | Note |
|---|---|---|
| `components/ui/*.tsx` | ~55 Radix-based primitives | Regenerated by `shadcn add`; extend, do not fork |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) | Imported by all 55 ui files; moving it breaks every import |
| `hooks/use-mobile.ts` | Mobile breakpoint hook | Used by `ui/sidebar.tsx`; vendored, leave in place |
| `index.css` | Tailwind + oklch tokens + Geist font | Thin shell only — add JSW brand tokens here (`--jsw-blue`, `--jsw-red`, `--jsw-steel`) when needed, do not add feature selectors |

**Known lint noise:** `components/ui/*` and `hooks/use-mobile.ts` carry exactly 12 pre-existing ESLint errors (`react-refresh/only-export-components`, `react-hooks/set-state-in-effect`). These are vendored and out of scope — do not fix them.

---

## 250-Line Rule & Decomposition

Every **manually maintained** frontend source file must stay at or below **250 lines**.

When a file approaches the limit, decompose in this order:

1. Extract feature-local hooks → `components/<domain>/<feature>/hooks/use*.ts`
2. Extract UI subcomponents → sibling files in `components/<domain>/<feature>/`
3. Extract type contracts → `types/<domain>/<feature>-ui.ts`
4. Extract API calls → `api/<domain>/<verb>.ts`

The 250-line rule does not apply to vendored files in `components/ui/` or `lib/utils.ts`.

**Tailwind-first styling:** use Tailwind utilities for layout, spacing, sizing, and breakpoints. Reach for `*.module.css` only for pseudo-elements, keyframes, layered backgrounds, and complex selectors that Tailwind cannot express cleanly. Never add feature selectors to `index.css`.
