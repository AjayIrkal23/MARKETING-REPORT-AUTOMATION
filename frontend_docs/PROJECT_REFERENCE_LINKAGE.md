# Frontend Project Reference & Linkage

Navigation and linkage map for AI agents and developers. Read this before editing any file.
Govering skills: **project-reference-linkage**, **project-structure-map**.

---

## Mandatory Directory Map

| Layer | Pattern | Notes |
|---|---|---|
| **Types** | `src/types/<domain>/<name>.ts` | App-owned contracts only. No inline `interface Props`. |
| **API modules** | `src/api/<domain>/<action>.ts` | One exported function per file. Never call `fetch` elsewhere. |
| **API base client** | `src/api/client.ts` | `getData`, `postData`, `getList`, `buildQuery`, `ApiError`. |
| **Store slices** | `src/store/<domain>/slice.ts` | RTK `createSlice`. |
| **Store selectors** | `src/store/<domain>/selectors.ts` | All state reads go through these — no inline `s.auth.*`. |
| **Redux plumbing** | `src/app/store.ts`, `src/app/hooks.ts` | `RootState`, `AppDispatch`, `useAppDispatch`, `useAppSelector`. |
| **Feature UI** | `src/components/<domain>/<feature>/` | Presentational; feature hook at `.../hooks/use<Name>.ts`. |
| **Vendored UI** | `src/components/ui/*.tsx` | shadcn/ui — do not restructure. |
| **Shared hooks** | `src/hooks/use-mobile.ts` | shadcn shared; do not move. |
| **Utilities** | `src/lib/utils.ts` | `cn()` — imported by ~51 `ui/` files; do not move. |
| **Pages** | `src/pages/<domain>/<route>/index.tsx` | Thin orchestrators. No business logic. |
| **Routes** | `src/routes/ProtectedRoute.tsx` | Auth guard. |
| **Styles** | `src/index.css` | Tailwind v4 import + shadcn oklch tokens + Geist font. |
| **App entry** | `src/App.tsx`, `src/main.tsx` | Router + Redux `Provider`. |

**Current domains on disk:** `api` (envelope/error), `auth`, `meta`, `theme`, `user`.

---

## Linkage Table

| You change... | Also check / update |
|---|---|
| `types/auth/session.ts` — `AuthState`, `SessionUser` | `store/auth/slice.ts` (state shape), `store/auth/selectors.ts` (return types), `components/auth/login/hooks/useLoginForm.ts` (dispatch payload), `pages/auth/login/index.tsx` |
| `types/auth/auth.ts` — `LoginCredentials`, `AuthUser` | `api/auth/login.ts` (arg + return), `useLoginForm.ts` (TODO stub when real API is wired) |
| `types/auth/login-ui.ts` — `UseLoginFormResult` | `components/auth/login/hooks/useLoginForm.ts` (return), `components/auth/login/LoginForm.tsx` (destructure) |
| `types/api/envelope.ts` — `ApiSuccess`, `PaginatedResult`, `PageQuery` | `api/client.ts` (imports all three), every `api/<domain>/*.ts` that calls `getList` |
| `types/api/error.ts` — `ApiErrorBody` | `api/client.ts` (`ApiError` constructor) |
| `types/user/user.ts` — `UserPublic`, `UserListQuery` | `api/user/list.ts` |
| `types/meta/meta.ts` — `HealthData`, `PingData`, `RootData` | `api/meta/health.ts`, `api/meta/ping.ts` |
| `api/client.ts` — any helper signature | Every `api/<domain>/*.ts` (all delegate to it) |
| `api/auth/login.ts` | `useLoginForm.ts` (currently stubbed with mock; see TODO comment) |
| `api/user/list.ts` | Any future users page / hook that calls `listUsers()` |
| `store/auth/slice.ts` — actions `loginSuccess`, `logout` | `components/auth/login/hooks/useLoginForm.ts` (`loginSuccess` dispatch), any future logout trigger |
| `store/auth/selectors.ts` — `selectIsAuthenticated` | `routes/ProtectedRoute.tsx`, `pages/auth/login/index.tsx` |
| `store/auth/selectors.ts` — `selectSessionUser`, `selectAuthToken` | Any future component that reads session identity |
| `app/store.ts` — `RootState`, `AppDispatch` | `app/hooks.ts`, `store/auth/selectors.ts` (imports `RootState`) |
| `app/hooks.ts` | Every file that calls `useAppDispatch` / `useAppSelector` |
| `routes/ProtectedRoute.tsx` | `App.tsx` (wraps protected routes as `<Route element>`) |

---

## Real Import Graph — Auth Domain End-to-End

```
types/api/envelope.ts          ← ApiSuccess, PaginatedResult
types/api/error.ts             ← ApiErrorBody
        ↓
api/client.ts                  ← getData, postData, getList, buildQuery, ApiError
        ↓
api/auth/login.ts              ← postData("/auth/login") → AuthUser

types/auth/session.ts          ← AuthState, SessionUser
        ↓
store/auth/slice.ts            ← createSlice(auth); loginSuccess, logout
        ↓
app/store.ts                   ← configureStore({ auth }); RootState, AppDispatch
        ↓
app/hooks.ts                   ← useAppDispatch<AppDispatch>, useAppSelector<RootState>
        ↓
store/auth/selectors.ts        ← selectIsAuthenticated, selectSessionUser (uses RootState)

types/auth/login-ui.ts         ← UseLoginFormResult
        ↓
components/auth/login/
  hooks/useLoginForm.ts        ← useAppDispatch (loginSuccess), useNavigate; returns UseLoginFormResult
  LoginForm.tsx                ← useLoginForm(); renders ui/button, ui/input, ui/label, ui/card

pages/auth/login/index.tsx     ← useAppSelector(selectIsAuthenticated); renders <LoginForm />
pages/dashboard/home/index.tsx ← stub; no imports yet

routes/ProtectedRoute.tsx      ← useAppSelector(selectIsAuthenticated); Navigate or <Outlet />

App.tsx                        ← BrowserRouter; /login → LoginPage; ProtectedRoute → /home → HomePage
main.tsx                       ← <Provider store={store}><App /></Provider>
```

**Note — mock auth**: `useLoginForm.ts` currently dispatches `loginSuccess` with a hardcoded `"dev-token"` (any non-empty creds pass). `api/auth/login.ts` exists and is ready; wire it in when real auth is implemented.

---

## API Envelope Contract

All backend responses must conform to:

```ts
// Success
{ success: true, data: T, message: string, meta?: PaginationMeta | null }

// Error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

Pagination defaults: `page=1`, `limit=20`, max `100`; `sortBy` + `sortOrder` from server whitelist. Never filter, sort, or paginate on the client — pass query params to the backend via `buildQuery()`.

---

## Hard Rules (enforced via hooks)

| Rule | Detail |
|---|---|
| No `fetch` in components | All HTTP goes through `api/client.ts` helpers |
| No inline type ownership | Types live in `types/<domain>/` — not inside `.tsx` files |
| No client-side data filtering | Send params to backend; render what comes back |
| File size | 250-line hard cap; split at ~200 via hooks / helpers |
| Tailwind v4 | `@tailwindcss/vite` plugin — no `tailwind.config.js` |
| Semantic tokens only | Use `--primary`, `--destructive`, etc.; min 4.5:1 contrast; no raw hex |
| JSW brand tokens | `--jsw-blue`, `--jsw-red`, `--jsw-steel` not yet defined — add to `index.css` before use |
| Redux hooks | Always `useAppDispatch` / `useAppSelector` — never raw `useDispatch` / `useSelector` |
| `import type` | Use `import type` for type-only imports (TS `verbatimModuleSyntax`) |
| `lib/utils.ts` | Do not move — 51 `ui/` files import `cn()` from this exact path |
| `components/ui/` | Vendored shadcn — do not restructure; 12 pre-existing eslint errors are out of scope |
| No `tailwind.config.js` | v4 is config-file-free; tokens live in `index.css` |

---

## Verification Checklist

Before marking any change complete:

- [ ] Path matches `{layer}/{domain}/{file}` — no straying from the map above
- [ ] Every new import uses `import type` for type-only references
- [ ] No file exceeds 250 lines; split if approaching 200
- [ ] New types are in `types/<domain>/` — not inline in `.tsx` or hook files
- [ ] API calls only in `api/<domain>/` — none inside components or hooks
- [ ] `useAppDispatch` / `useAppSelector` used everywhere (not raw hooks)
- [ ] All selector reads go through `store/auth/selectors.ts` (not `s.auth.*` inline)
- [ ] Design tokens used (`--primary`, etc.) — no raw hex colors
- [ ] No client-side filtering, sorting, or pagination of server data
- [ ] Run `npm run build` (tsc -b + vite build) — must stay GREEN
- [ ] Run `npm run lint` — no new errors outside `components/ui/` and `hooks/use-mobile.ts`
- [ ] Grep for the changed symbol across `src/` to catch missed consumers: `grep -r "symbolName" frontend/src --include="*.ts" --include="*.tsx"`
