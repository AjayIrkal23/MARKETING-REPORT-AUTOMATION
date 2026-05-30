# Frontend Type Ownership

Every app-owned type has exactly one canonical home in `src/types/<domain>/`; nothing is declared inline inside `.tsx`, hook, API, or store files.

Governing skill: **frontend-structure-standards** (§4 Type Ownership, §12 File Size Limit).

---

## Canonical types/ Tree (the real one)

```
src/types/
├── api/
│   ├── envelope.ts   # ApiSuccess<T>, PaginationMeta, PaginatedResult<T>, PageQuery, SortOrder
│   └── error.ts      # ApiErrorBody, ApiErrorEnvelope
├── auth/
│   ├── auth.ts       # LoginCredentials, AuthUser  — wire types (POST /auth/login)
│   ├── session.ts    # SessionUser, AuthState      — Redux slice + localStorage model
│   └── login-ui.ts   # UseLoginFormResult          — feature UI contract (<feature>-ui.ts)
├── meta/
│   └── meta.ts       # RootData, HealthData, PingData
├── theme/
│   └── theme.ts      # Theme, ThemeContextValue
└── user/
    └── user.ts       # UserPublic, UserSortBy, UserListQuery
```

---

## Ownership Rules

| Type category | Canonical file | Example symbol |
|---|---|---|
| Component props / feature UI state | `src/types/<domain>/<feature>-ui.ts` | `UseLoginFormResult` in `auth/login-ui.ts` |
| Backend API request / response contracts | `src/types/<domain>/auth.ts` (or similar) | `LoginCredentials`, `AuthUser` |
| Redux slice state | `src/types/<domain>/session.ts` | `AuthState`, `SessionUser` |
| Generic API envelope / pagination | `src/types/api/envelope.ts` | `ApiSuccess<T>`, `PaginatedResult<T>` |
| Generic API error shape | `src/types/api/error.ts` | `ApiErrorBody`, `ApiErrorEnvelope` |
| Theme context | `src/types/theme/theme.ts` | `Theme`, `ThemeContextValue` |

All other layers — components, hooks, API modules, store slices, selectors — **import** these types. They do not declare their own.

---

## API Contract vs Session Model (auth domain)

The `auth/` domain has three files with distinct responsibilities:

| File | Boundary | Key types | Source of truth |
|---|---|---|---|
| `auth/auth.ts` | **Wire contract** — backend `POST /auth/login` | `LoginCredentials`, `AuthUser` | Backend response |
| `auth/session.ts` | **Client session model** — Redux store + `localStorage` | `SessionUser`, `AuthState` | Redux `auth` slice |
| `auth/login-ui.ts` | **Feature UI contract** — login form props/hook | `UseLoginFormResult` | `useLoginForm` hook return |

**Current mismatch to be aware of:** `AuthUser` (from the backend) uses `emailid: string` and `isAdmin: boolean`. `SessionUser` (in the store) uses `name: string`, `email: string`, `role: string`. The mock login (`store/auth/slice.ts`) currently derives the session shape from the raw email — there is no real `/auth/login` call yet. When the real API lands, the mapping layer between `AuthUser` and `SessionUser` must live in `api/auth/login.ts` or a dedicated mapper, not inside the slice or a component.

---

## Adding a New Domain

1. Create `src/types/<domain>/` — one folder per domain.
2. Add one focused file per boundary: `<domain>.ts` for the API contract, `<feature>-ui.ts` for feature UI props.
3. Add query params type extending `PageQuery` if the domain has a list endpoint (see `user/user.ts → UserListQuery`).
4. Import with the `@/types/<domain>/...` path alias.

```ts
// Good — import from types/
import type { UserPublic, UserListQuery } from "@/types/user/user"
import type { PaginatedResult } from "@/types/api/envelope"
```

---

## Anti-patterns

| Anti-pattern | Problem | Correct approach |
|---|---|---|
| `interface Props { ... }` inside a `.tsx` file | Inline ownership; type is invisible to other consumers | Move to `src/types/<domain>/<feature>-ui.ts` |
| `interface LoginFormState` inside a hook file | Same — inline, hidden, not reusable | `auth/login-ui.ts` |
| `src/types/types.ts` catch-all | Becomes a dumping ground; breaks domain isolation | One focused file per boundary |
| Response contracts inside `api/<domain>/*.ts` | API module owns types — can't be imported without pulling in fetch logic | Move contracts to `types/<domain>/` |
| Store contracts in `store/<domain>/slice.ts` | Buries the shape inside implementation | `types/<domain>/session.ts` owns `AuthState` |
| `as any` to avoid typing a response | Defeats the envelope contract | Use `ApiSuccess<T>` and narrow at the call site |

---

## verbatimModuleSyntax — `import type`

TypeScript is configured with `verbatimModuleSyntax: true`. This means:

- **All type-only imports must use `import type`** — the compiler errors if you omit it.
- Every import that is only a type (not a value) must be `import type { ... }`.

```ts
// Correct
import type { AuthState, SessionUser } from "@/types/auth/session"
import type { PageQuery } from "@/types/api/envelope"

// Wrong — will fail to compile under verbatimModuleSyntax
import { AuthState } from "@/types/auth/session"
```

`login-ui.ts` demonstrates this pattern — it uses `import type { ChangeEvent, FormEvent } from "react"` for the React event types it references.

---

## Reference: `api/envelope.ts` shapes

These are the generic containers used across all domain API calls:

```ts
interface ApiSuccess<T> { success: true; data: T; message: string; meta?: PaginationMeta | null }
interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; sortBy: string; sortOrder: SortOrder }
interface PaginatedResult<T> { data: T[]; meta: PaginationMeta }
interface PageQuery { page?: number; limit?: number; sortOrder?: SortOrder }
```

Domain list query types extend `PageQuery` and add whitelisted `sortBy` (example: `UserListQuery extends PageQuery` in `types/user/user.ts`).
