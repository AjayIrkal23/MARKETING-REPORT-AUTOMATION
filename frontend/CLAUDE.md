# Frontend — Agent Surface Guide

JSW Steel Marketing Report Automation — Vite + React dashboard.
Root: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/frontend/`

---

## Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 8 |
| UI framework | React 19.2 |
| Language | TypeScript ~6.0 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Component library | shadcn/ui (~55 components, Radix UI based) |
| State management | Redux Toolkit 2 + react-redux 9 |
| Routing | react-router-dom 7 |
| Charts | recharts 3 |
| Icons | lucide-react |
| Toasts | sonner |
| Theming | next-themes |
| Date utilities | date-fns |
| Carousel | embla-carousel |
| Drawer | vaul |
| Command palette | cmdk |
| OTP input | input-otp |

---

## Commands

```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # eslint .
npm run preview      # vite preview → http://localhost:4173
```

---

## Actual src/ Structure

> This tree reflects the **verified source on disk** as of 2026-05-29.
> `src/` is still minimal; some files referenced elsewhere do **not yet exist** — see "Scaffold gaps" below.

```
src/
├── app/
│   ├── store.ts          # Redux store configuration
│   └── hooks.ts          # Typed useAppDispatch / useAppSelector
├── features/
│   └── auth/
│       └── authSlice.ts  # loginSuccess / logout; hydrated from localStorage
├── lib/
│   ├── api.ts            # Backend HTTP client (centralised)
│   └── utils.ts          # cn() Tailwind class merge helper
├── routes/
│   └── ProtectedRoute.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── HomePage.tsx
├── components/
│   ├── theme-provider.tsx  # ThemeProvider (light / dark)
│   └── ui/               # ~55 shadcn/ui primitives
│       └── *.tsx
├── hooks/
│   └── use-mobile.ts
├── App.tsx
├── main.tsx
└── index.css             # JSW brand tokens + Tailwind base
```

---

## Routing

| Path | Page | Auth |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/home` | `HomePage` | Protected |
| `/` | Redirect → `/home` | — |
| `*` | Redirect → `/home` | — |

**ProtectedRoute**: reads `auth.isAuthenticated` from Redux store; redirects to `/login` when `false`.

---

## State

- **Store**: `src/app/store.ts` — single Redux store.
- **Typed hooks**: `useAppDispatch` / `useAppSelector` in `src/app/hooks.ts`; use these, never raw `useDispatch` / `useSelector`.
- **Auth slice** (`src/features/auth/authSlice.ts`):
  - Actions: `loginSuccess`, `logout`.
  - Persisted to `localStorage`; rehydrated on store init.
  - **Mock auth**: any non-empty username + password is accepted — no real API call yet.

> **Scaffold gaps — gotcha**: `src/` has no data/ping slice
> (`src/features/ping/pingSlice.ts` / `sendPing`), no dashboard layout
> (`src/components/layout/DashboardLayout.tsx`), and no logo (`src/components/jsw-logo.tsx`).
> **None of these exist as of 2026-05-29**, and the frontend changes often
> (`README.md` + `index.css` were edited mid-setup). Verify the live `src/` tree before
> relying on any doc for feature completeness.

---

## Theming

`src/index.css` defines the standard shadcn/ui oklch design tokens under `:root` and `.dark`, plus the Geist Variable font:

```css
--primary        /* shadcn primary */
--destructive    /* shadcn destructive */
--sidebar        /* sidebar surface */
--color-chart-1  /* ...chart palette, etc. */
```

`ThemeProvider` (in `src/components/theme-provider.tsx`) wraps the app and handles light / dark switching via next-themes.

> **No JSW-specific brand tokens (`--jsw-blue` / `--jsw-red` / `--jsw-steel`) exist yet.** Add them to `index.css` before referencing them; until then use the shadcn semantic tokens above. Always use semantic tokens rather than raw hex values in new components.

---

## API Access

- All `/api/*` requests are **proxied to the backend** (`http://localhost:8000`) by `vite.config.ts`.
- Override the base URL with the env var `VITE_API_URL` if needed.
- **Single client**: `src/lib/api.ts` — all backend calls go through this file.
- Do **not** call `fetch` or `axios` directly inside components or hooks; route through `src/lib/api.ts`.

Expected backend response envelopes (when the API is implemented):

```ts
// success
{ success: true, data: T, message: string, meta?: PaginationMeta }

// error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

Pagination defaults: `page=1`, `limit=20`, max `100`; `sortBy` and `sortOrder` from a server-side whitelist.

---

## Mandatory Frontend Rules

These rules are enforced globally via `~/.claude/` hooks. Summary for this repo:

| Rule | Detail |
|---|---|
| No client-side filtering | Never filter / sort / paginate server data in the browser; send query params to the API |
| Types location | Domain types in `src/types/<domain>/` (create when adding a new domain) |
| API calls | Only in `src/lib/api.ts` or a dedicated `src/api/<domain>/` module — never inside components |
| Design tokens | Use shadcn semantic tokens (`--primary`, `--destructive`, …); JSW brand tokens not yet defined; contrast ratio ≥ 4.5:1 |
| File size | No file > 250 lines; split components at > 200 lines |
| Tailwind v4 | Use `@tailwindcss/vite` plugin; do not use `tailwind.config.js` (v3 pattern) |
| shadcn components | Extend from `src/components/ui/`; do not fork Radix primitives directly |
| Typed Redux hooks | Always `useAppDispatch` / `useAppSelector` — never raw `useDispatch` / `useSelector` |

---

## Related Docs

- Root overview: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/README.md`
- Backend guide: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/backend/` (FastAPI, port 8000)
- Domain data dictionary: `/DATA/CODE_FILES/MARKETING REPORT AUTOMATION/macro_docs/README.md`
