# Frontend State Management

Redux Toolkit 2 state layer for the JSW Marketing Report Automation dashboard — governing skills: `react-hooks-patterns`, `frontend-structure-standards`.

---

## Store (`app/store.ts`) + Typed Hooks (`app/hooks.ts`)

`src/app/store.ts` is the single Redux store. Every slice reducer is registered here.

```ts
// src/app/store.ts
export const store = configureStore({
  reducer: {
    auth: authReducer,   // only slice as of 2026-05-29
  },
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

`src/app/hooks.ts` exports the two typed wrappers — **always use these, never raw `useDispatch`/`useSelector`**:

```ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

Adding a new slice: import its reducer in `store.ts`, add a key to `reducer: {}`, then re-export `RootState` — no other wiring needed.

---

## Slices (`store/<domain>/slice.ts`) — auth example + localStorage hydration

Each domain slice lives at `src/store/<domain>/slice.ts`. The `auth` slice is the canonical reference.

**Key implementation details:**

| Detail | Value |
|--------|-------|
| Slice name | `"auth"` |
| State type | `AuthState` from `src/types/auth/session.ts` |
| Actions | `loginSuccess(payload: { user: SessionUser; token: string })`, `logout()` |
| localStorage keys | `"app.auth.token"`, `"app.auth.user"` |
| Hydration | `loadInitialState()` runs at module load — parses both keys, falls back to unauthenticated on any error |
| Side effects in reducers | `localStorage.setItem` / `removeItem` live directly in reducers (Immer-safe, synchronous only) |

```ts
// src/store/auth/slice.ts (abbreviated)
function loadInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (token && userRaw)
      return { isAuthenticated: true, token, user: JSON.parse(userRaw) as SessionUser }
  } catch { /* ignore corrupt storage */ }
  return { isAuthenticated: false, user: null, token: null }
}
```

**Mock auth note (documented decision, not a bug):** `loginSuccess` is dispatched with `token: "dev-token"` and a user built from the email field. The real `src/api/auth/login.ts` module exists but is not yet wired — swap it in `useLoginForm.ts` when the backend auth endpoint is live.

**Adding a new slice:**

```
src/
  store/<domain>/
    slice.ts       # createSlice — state + reducers
    selectors.ts   # all state access goes through selectors
    thunks.ts      # (optional) async side effects
  types/<domain>/
    <domain>.ts    # AuthState-equivalent; imported by slice, not defined inside it
```

Register the new reducer in `src/app/store.ts`.

---

## Selectors (`store/<domain>/selectors.ts`)

All state reads must go through selectors — never inline `(s: RootState) => s.auth.foo` inside components.

**Current auth selectors** (`src/store/auth/selectors.ts`):

| Selector | Returns |
|----------|---------|
| `selectAuth` | Full `AuthState` |
| `selectIsAuthenticated` | `boolean` |
| `selectSessionUser` | `SessionUser \| null` |
| `selectAuthToken` | `string \| null` |

Usage in a component or hook:

```ts
import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated, selectSessionUser } from "@/store/auth/selectors"

const isAuthenticated = useAppSelector(selectIsAuthenticated)
const user = useAppSelector(selectSessionUser)
```

`ProtectedRoute` (`src/routes/ProtectedRoute.tsx`) is the live example — it reads `selectIsAuthenticated` to decide whether to render `<Outlet />` or redirect to `/login`.

---

## When to use global state

| Use global Redux state | Use local `useState` / custom hook |
|------------------------|------------------------------------|
| Auth / session (`isAuthenticated`, `user`, `token`) | Form field values, validation errors |
| Data shared across multiple unrelated routes | UI toggle state (open/closed, tab index) |
| Cached server responses used by 2+ features | Data fetched only by one component |
| App-wide config or feature flags | Derived values — compute from selectors instead |

**Do not store derived data** in slices. If a value can be computed from existing state (e.g., a display name from `user.name`), derive it in a selector or in the component — not as a separate slice field.

---

## Rules

### Mandatory

| Rule | Detail |
|------|--------|
| Typed hooks only | `useAppDispatch` / `useAppSelector` — never raw `useDispatch` / `useSelector` |
| Selectors for all reads | No inline `s => s.<slice>.<field>` in components or hooks |
| Types in `src/types/<domain>/` | `AuthState`, `SessionUser` live in `types/auth/session.ts` — not in `slice.ts` |
| No UI logic in store | Slices hold data only — presentation decisions (labels, colors) belong in components |
| No API calls in slices | Async work goes in thunks (`thunks.ts`) or feature hooks; never in `createSlice.reducers` |
| One domain per slice | Do not share a slice across unrelated domains |
| File size ≤ 250 lines | If a slice file grows beyond 250 lines, extract thunks and/or split sub-domains |
| `import type` for type-only imports | TS `verbatimModuleSyntax` is on — use `import type { Foo }` for types |

### Adding a new domain to the store

1. Create `src/types/<domain>/<domain>.ts` — define the state interface there.
2. Create `src/store/<domain>/slice.ts` — import the state type; do not re-declare it inline.
3. Create `src/store/<domain>/selectors.ts` — one selector per meaningful field.
4. Register the reducer in `src/app/store.ts` under a new key.
5. `RootState` updates automatically — no other files need changing.

### Type file locations (auth as reference)

| Type | File |
|------|------|
| Redux state shape | `src/types/auth/session.ts` — `AuthState`, `SessionUser` |
| API wire types | `src/types/auth/auth.ts` — `LoginCredentials`, `AuthUser` |
| Login form UI contracts | `src/types/auth/login-ui.ts` — `UseLoginFormResult` |
| API envelope + pagination | `src/types/api/envelope.ts` — `ApiSuccess<T>`, `PaginationMeta`, `PageQuery` |

Store-facing contracts belong in `src/types/<domain>/`, never declared inline inside `slice.ts` or `selectors.ts`.
