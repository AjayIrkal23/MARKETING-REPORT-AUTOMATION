# Frontend Conventions

Quick-reference naming, file-size, import, and anti-pattern rules for the JSW Marketing Report Automation frontend. Governing skills: **`frontend-standards-always-follow`** and **`frontend-structure-standards`**.

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| React component | PascalCase; file name matches export | `LoginForm.tsx` → `export function LoginForm` |
| Custom hook | `use` + CamelCase; file name matches export | `useLoginForm.ts` → `export function useLoginForm` |
| Plain function / util | camelCase | `buildQuery`, `cn` |
| Type / interface file | Named for the owning boundary or contract — never generic `types.ts` | `login-ui.ts`, `envelope.ts`, `session.ts` |
| Route page entry | `pages/<domain>/<route>/index.tsx` | `pages/auth/login/index.tsx` |
| Feature UI component | `components/<domain>/<feature>/ComponentName.tsx` | `components/auth/login/LoginForm.tsx` |
| Feature-local hook | `components/<domain>/<feature>/hooks/useHookName.ts` | `components/auth/login/hooks/useLoginForm.ts` |
| Shared hook (multi-feature) | `hooks/<domain>/use-hook-name.ts` | `hooks/use-mobile.ts` |
| API module | `api/<domain>/<verb>.ts` — one endpoint per file | `api/auth/login.ts`, `api/meta/health.ts` |
| Store files | `store/<domain>/slice.ts`, `store/<domain>/selectors.ts` | `store/auth/slice.ts` |
| App-owned types | `types/<domain>/<boundary>.ts` | `types/auth/session.ts`, `types/api/envelope.ts` |

---

## File Size

- **Hard limit: 250 lines** for every manually maintained source file.
- **Split at 200 lines** — do not wait for the limit before extracting.
- When a file exceeds 250 lines it **must** be refactored before new behaviour is added (unless the user explicitly scopes cleanup out).

Extraction order of preference:
1. Extract UI sub-components under `components/<domain>/<feature>/`.
2. Extract hook logic into `components/<domain>/<feature>/hooks/`.
3. Move inline type declarations to `types/<domain>/<boundary>.ts`.
4. Extract helpers/utilities.

`components/ui/*` (vendored shadcn) is exempt — do not restructure it.

---

## Imports

### Path alias

All app-owned imports use the `@` alias (resolves to `src/`). Never use relative `../../` paths for cross-module imports.

```ts
// correct
import { LoginForm } from "@/components/auth/login/LoginForm"
import type { AuthState } from "@/types/auth/session"

// wrong
import { LoginForm } from "../../components/auth/login/LoginForm"
```

### `import type` for type-only imports

The project uses `verbatimModuleSyntax`. Every import that is only a type (interface, type alias) **must** use `import type`.

```ts
import type { ApiSuccess, PaginatedResult } from "@/types/api/envelope"
import type { ApiErrorBody } from "@/types/api/error"
```

Mixed (value + type from the same module) is allowed:
```ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
```

### Stable import rules

- `lib/utils.ts` (`cn()`) is imported by 51 shadcn files — **do not move it**.
- `app/hooks.ts` exports `useAppDispatch` / `useAppSelector` — import these instead of raw `useDispatch` / `useSelector`.
- `api/client.ts` exports `getData`, `postData`, `getList`, `buildQuery`, and `ApiError` — domain API modules build on these; they never call `fetch` directly.

---

## API & Envelope

All backend responses follow the standard envelope. The client helpers in `api/client.ts` unwrap `data` and throw `ApiError` on failure — domain modules must not re-parse the envelope.

**Success:** `{ success: true, data, message, meta? }`  
**Error:** `{ success: false, error: { code, message, details? } }`  
**Paginated list meta:** `{ page, limit, total, totalPages, sortBy, sortOrder }`

Pagination params: `page=1 limit=20 max=100`, default sort `createdAt desc`. Whitelist `sortBy` keys per endpoint.

---

## Anti-patterns

| Anti-pattern | Why it is banned | Correct approach |
|---|---|---|
| API call inside a component | Couples transport to render tree | Put it in `api/<domain>/*.ts`; call from a hook |
| `interface Props { ... }` declared inside a `.tsx` file | Hidden type ownership; grows files past 250 lines | Move to `types/<domain>/<feature>-ui.ts` |
| Inline `type`/`interface` in slice, selector, or API module | Types belong in `types/<domain>/` | Import from `types/<domain>/` |
| `catch-all types.ts` file | Becomes a dumping ground | One focused file per boundary |
| Client-side filter/sort/paginate of server-backed data | Contradicts backend-driven pagination contract | Let the backend filter; pass query params via `buildQuery` |
| Raw `useDispatch` / `useSelector` | Loses type safety | Use `useAppDispatch` / `useAppSelector` from `app/hooks.ts` |
| Hardcoded hex colours in Tailwind classes or inline styles | Not themeable, fails contrast audit | Use semantic tokens (`--primary`, `--destructive`, `--jsw-blue`) |
| Adding feature/page rules to `src/index.css` | Violates styling layer ownership | Tailwind utilities first; feature-local visuals in `*.module.css` |
| Moving or restructuring `components/ui/*` | Vendored shadcn — ESLint errors are expected and out of scope | Leave as-is |
| `any` unless unavoidable | Defeats TypeScript | Narrow types; use `unknown` + type guard |
| Relative cross-module imports (`../../`) | Fragile on moves | Use `@/` alias |

---

## Styling Layer Rules

| Layer | File | Use for |
|---|---|---|
| Global base | `src/index.css` | Tailwind import, shadcn tokens, Geist font, `@theme` block only |
| Domain shared | `src/styles/<domain>/index.css` | Non-module CSS shared across features in a domain |
| Feature local | `src/components/<domain>/<feature>/*.module.css` | Pseudo-elements, keyframes, layered backgrounds, complex selectors |
| Utilities | Tailwind classes | Layout, spacing, sizing, typography, breakpoints, state variants |

JSW brand tokens (`--jsw-blue`, `--jsw-red`, `--jsw-steel`) are **not yet defined** — add them to `src/index.css` `@theme` block before referencing. Minimum contrast ratio: **4.5:1**.

---

## Pre-commit Checklist

- [ ] No new `interface Props` or custom type declared inside a `.tsx`/`.ts` implementation file — moved to `types/<domain>/`.
- [ ] No API (`fetch` or `getData`/`postData`) call inside a component — lives in `api/<domain>/`.
- [ ] No raw `useDispatch`/`useSelector` — using `useAppDispatch`/`useAppSelector`.
- [ ] Every type-only import uses `import type`.
- [ ] All cross-module imports use the `@/` alias.
- [ ] No touched manually maintained file is over 250 lines.
- [ ] No client-side filtering of server data — query params passed to backend.
- [ ] Styling uses semantic tokens; no raw hex; no feature rules in `src/index.css`.
- [ ] `lib/utils.ts` was not moved.
- [ ] Build is green: `npm run build` (tsc -b && vite build).
- [ ] Lint is clean for app-owned files: `npm run lint` (12 known errors in `components/ui/*` + `hooks/use-mobile.ts` are vendored and out of scope).
