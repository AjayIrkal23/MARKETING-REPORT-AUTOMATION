# Frontend API Layer

How to call the backend from the JSW Marketing Report Automation frontend: transport helpers, envelope contracts, one-file-per-action module layout, and backend-driven list queries.

Governing skills: `frontend-response-handling` (primary), `frontend-api-standards`, `frontend-server-data-patterns`.

---

## client.ts — Transport Helpers and ApiError

**File:** `src/api/client.ts`

The single transport for all backend calls. Domain modules call these helpers — they never call `fetch` directly.

| Export | Signature | Purpose |
|--------|-----------|---------|
| `getData<T>` | `(path: string) => Promise<T>` | GET a single resource; unwraps `data` |
| `postData<T>` | `(path: string, body: unknown) => Promise<T>` | POST JSON; unwraps `data` |
| `getList<T>` | `(path: string) => Promise<PaginatedResult<T>>` | GET a paginated list; returns `{ data, meta }` |
| `buildQuery` | `(params: Record<string, string \| number \| undefined>) => string` | Serialises a query object to `?k=v&...`; skips empty/undefined values |
| `ApiError` | `class extends Error` | Thrown on any non-success response; carries `.code`, `.status`, `.details` |

**Base URL:** `VITE_API_URL` env var, defaulting to `/api`. In dev, `/api/*` is proxied to `http://localhost:8000` by `vite.config.ts`.

**Request flow:** every call goes through the internal `request<T>()` which:
1. Sends `Accept: application/json` + `Content-Type: application/json`.
2. Parses the response body as JSON.
3. Checks `res.ok && envelope.success === true`.
4. Throws `ApiError` if either check fails, using `envelope.error` or a fallback `UNKNOWN` body.
5. Returns the typed `ApiSuccess<T>` envelope on success.

---

## Envelope and Error Handling

**Files:** `src/types/api/envelope.ts`, `src/types/api/error.ts`

### Success envelope (`ApiSuccess<T>`)

```ts
interface ApiSuccess<T> {
  success: true
  data: T
  message: string
  meta?: PaginationMeta | null
}
```

`getData` / `postData` unwrap `data`. `getList` returns `{ data: T[], meta: PaginationMeta }` as `PaginatedResult<T>`.

### Pagination meta (`PaginationMeta`)

```ts
interface PaginationMeta {
  page: number; limit: number; total: number; totalPages: number
  sortBy: string; sortOrder: "asc" | "desc"
}
```

### Error envelope (`ApiErrorBody`)

```ts
interface ApiErrorBody { code: string; message: string; details?: unknown }
```

### Runtime error class (`ApiError`)

```ts
class ApiError extends Error {
  readonly code: string      // backend error code, e.g. "UNAUTHORIZED"
  readonly status: number    // HTTP status
  readonly details?: unknown
}
```

`ApiError` is thrown by the client — never let raw `fetch` `Response` or `json` objects reach components. Catch `ApiError` in the store/thunk layer and map to user-visible state. Never surface `error.details` to the UI.

---

## One API Per File

`src/api/<domain>/<action>.ts` — one exported function per file. Each module imports only from `@/api/client` and `@/types/<domain>/`.

| File | Endpoint | Client helper | Return type |
|------|----------|---------------|-------------|
| `api/auth/login.ts` | `POST /auth/login` | `postData` | `Promise<AuthUser>` |
| `api/user/list.ts` | `GET /users` | `getList` + `buildQuery` | `Promise<PaginatedResult<UserPublic>>` |
| `api/meta/health.ts` | `GET /health` | `getData` | `Promise<HealthData>` |
| `api/meta/ping.ts` | `GET /ping` | `getData` | `Promise<PingData>` |

**Pattern — single-resource GET:**

```ts
// api/meta/health.ts
import { getData } from "@/api/client"
import type { HealthData } from "@/types/meta/meta"

export function getHealth(): Promise<HealthData> {
  return getData<HealthData>("/health")
}
```

**Pattern — paginated list GET:**

```ts
// api/user/list.ts
import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { UserListQuery, UserPublic } from "@/types/user/user"

export function listUsers(query: UserListQuery = {}): Promise<PaginatedResult<UserPublic>> {
  return getList<UserPublic>(`/users${buildQuery({ ...query })}`)
}
```

**Adding a new domain module:**
1. Create `src/api/<domain>/<action>.ts`.
2. Create matching types in `src/types/<domain>/`.
3. Import only `@/api/client` helpers and `@/types/<domain>/*` — no inline type definitions, no direct `fetch`.

---

## Backend-Driven Lists

Governed by `frontend-api-standards` + `frontend-server-data-patterns`.

### Query object shape

```ts
// src/types/api/envelope.ts
interface PageQuery {
  page?: number          // 1-based, default 1
  limit?: number         // default 20, max 100
  sortOrder?: "asc" | "desc"
}

// src/types/user/user.ts — domain extends PageQuery
interface UserListQuery extends PageQuery {
  sortBy?: "emailid" | "lastlogined" | "isAdmin"  // whitelist must match backend Literal
  q?: string             // optional case-insensitive email search
}
```

### Rules

| Rule | Detail |
|------|--------|
| No client-side filtering | Never `.filter()` / `.sort()` server data in the browser |
| No client-side pagination | Use `meta.total`, `meta.totalPages` from the backend; do not slice locally |
| Reset `page` on filter change | Any filter/search change that invalidates the current page must reset `page` to `1` |
| `buildQuery` skips empty values | Pass the full query object — `undefined` and `""` are automatically dropped |
| Sort keys are whitelisted | `sortBy` values must exist in the backend's `Literal` — align `UserSortBy` with backend source |

---

## Rules

### Layer boundaries

| Layer | Responsibility |
|-------|----------------|
| `api/<domain>/<action>.ts` | Call client helper; return typed domain data |
| `store/<domain>/slice.ts` | Dispatch thunk; hold loading/error/data state; catch `ApiError` |
| `pages/<domain>/<route>/index.tsx` | Read store state; render loading/error/success/empty states |
| `components/<domain>/<feature>/*` | Render only — no async, no `fetch`, no `ApiError` |

### Naming and structure

- **No fetch in components or hooks** — all calls go through `src/api/<domain>/<action>.ts`.
- **Types live in `src/types/<domain>/`** — no inline `interface` props that describe API shapes; no API types in `src/api/` files themselves.
- **`import type`** for all type-only imports (TypeScript `verbatimModuleSyntax` is enabled).
- **File size ≤ 250 lines** — split domain modules if they exceed this.
- **`@/` path alias** maps to `src/`; always use it, never use relative `../../` imports across feature boundaries.
- **Auth is mock** — `POST /auth/login` currently accepts any non-empty credentials and returns a `dev-token`. This is a documented architectural decision, not a bug. The `login()` function in `api/auth/login.ts` already matches the intended real-API signature.
