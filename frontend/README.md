# Frontend

Vite + React + TypeScript skeleton with Tailwind CSS v4, shadcn/ui, Redux Toolkit,
and React Router. No application content yet — a clean base to build on.

## Stack
- Vite 8 · React 19 · TypeScript 6
- Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (all components in `src/components/ui`)
- Redux Toolkit 2 + react-redux 9
- react-router-dom 7
- recharts 3 (charts) · lucide-react (icons) · sonner (toasts)

## Run
```bash
npm install
npm run dev        # http://localhost:5173
```
`/api/*` is proxied to the backend (`vite.config.ts`). Override with `VITE_API_URL`.

## Build
```bash
npm run build      # tsc -b && vite build  →  dist/
npm run preview
```

## Routes
| Path | Page | Access |
|------|------|--------|
| `/login` | `LoginPage` — minimal sign-in | public |
| `/home` | `HomePage` — empty placeholder | protected |
| `/` | redirects to `/home` | protected |
| `*` | redirects to `/home` | — |

`ProtectedRoute` redirects to `/login` when `auth.isAuthenticated` is false. The login
currently accepts any non-empty credentials and persists the session to `localStorage`
— replace with a real authentication call.

## State (Redux Toolkit)
- `auth` — `loginSuccess` / `logout`, hydrated from `localStorage`.

## Theming
Light/dark handled by `ThemeProvider` (`src/components/theme-provider.tsx`). Design tokens
live in `src/index.css` (`:root` + `.dark`).

## Structure
```
src/
  app/        store.ts, hooks.ts        (Redux store + typed hooks)
  features/   auth/authSlice.ts
  lib/        api.ts (backend client), utils.ts
  routes/     ProtectedRoute.tsx
  pages/      LoginPage.tsx, HomePage.tsx
  components/ theme-provider.tsx
  components/ui/   ← shadcn components
```
