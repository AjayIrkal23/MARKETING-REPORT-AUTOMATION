# Frontend Components

Component design rules for the JSW Marketing Report Automation dashboard: primitive usage, page/feature split, feature hooks, memoization, and the 250-line hard limit.

Governing skills: `frontend-structure-standards`, `frontend-ui-engineering`, `react-hooks-patterns`.

---

## shadcn/ui Primitives

All ~55 primitives live in `src/components/ui/` — vendored source, **not published packages**.

| Rule | Detail |
|---|---|
| Extend, never fork | Compose Radix primitives via the files in `components/ui/`; do not import from `@radix-ui/*` directly in feature code |
| Vendored, therefore read-only | `components/ui/*` and `hooks/use-mobile.ts` carry 12 known ESLint warnings (`react-refresh/only-export-components`, `react-hooks/set-state-in-effect`) — these are out of scope; do not "fix" them |
| `cn()` is sacred | `src/lib/utils.ts` exports `cn()` (Tailwind class merge); 51 ui files import it — **never move this file** |
| Composition over configuration | Use sub-components (`CardHeader`, `CardContent`, `CardFooter`) rather than mega-props |

### Real usage — `LoginForm.tsx`

```tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Label }  from "@/components/ui/label"
```

Primitive selection reference (representative subset):

| Primitive | File | Common use |
|---|---|---|
| `Button` | `ui/button.tsx` | All CTAs |
| `Input` | `ui/input.tsx` | Text fields |
| `Label` | `ui/label.tsx` | Accessible form labels |
| `Card` + sub-parts | `ui/card.tsx` | Panel containers |
| `Table` | `ui/table.tsx` | Data tables (future domain screens) |
| `Select` | `ui/select.tsx` | Dropdown selects |
| `Dialog` | `ui/dialog.tsx` | Modal overlays |
| `Skeleton` | `ui/skeleton.tsx` | Loading placeholders |
| `Sidebar` | `ui/sidebar.tsx` | Nav shell (uses `hooks/use-mobile.ts`) |

---

## Wide-table scroll pattern (Report JSW/JVML)

A data table wider than the viewport must scroll **inside its own box**, not widen
the page. Two parts:

1. **Page-level fix (once, app-wide):** `DashboardLayout` adds `min-w-0` to
   `SidebarInset` **and** `<main>`. Without it, the `flex-1` inset keeps its default
   `min-width:auto` and grows to the table's intrinsic width, so the whole page
   scrolls sideways and the table's own `overflow-x-auto` never engages.
2. **Table-level box:** the shadcn `Table` primitive accepts a `containerClassName`
   prop (forwarded to its scroll-container div). Pass
   `containerClassName="max-h-[calc(100vh-17rem)] overflow-auto rounded-lg border"`
   for a bounded box, then mark header/footer cells `sticky top-0` / `sticky
   bottom-0` with an **opaque** bg (`bg-background` / `bg-muted`) so scrolled rows
   don't bleed through. See `components/report/ReportPivotTable.tsx`.

**Optional columns** are a client-side *view* preference (not row filtering): the
toolbar "Columns" dropdown toggles `visibleCols` (`useReport`), and the table
renders trailing columns conditionally. The registry of toggleable columns lives in
`components/report/report-format.ts` (`REPORT_OPTIONAL_COLS` / `DEFAULT_REPORT_COLS`).

---

## Route Page vs Feature Component

The project follows a strict two-layer split enforced by `frontend-structure-standards`.

| Layer | Location | Responsibility |
|---|---|---|
| **Route page** (orchestrator) | `src/pages/<domain>/<route>/index.tsx` | Auth guards, top-level layout, route redirect logic; composes feature components |
| **Feature component** (UI owner) | `src/components/<domain>/<feature>/<Feature>.tsx` | Renders the actual UI; receives data/handlers from its hook |
| **Feature hook** | `src/components/<domain>/<feature>/hooks/use<Feature>.ts` | Local state, dispatch, navigation, validation logic |

### Live example — auth/login

```
pages/auth/login/index.tsx          ← route page (orchestrator)
  └─ components/auth/login/
       ├─ LoginForm.tsx              ← feature component (pure UI)
       └─ hooks/
            └─ useLoginForm.ts      ← feature hook (all logic)
```

**`pages/auth/login/index.tsx`** — thin orchestrator, 17 lines:

```tsx
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  if (isAuthenticated) return <Navigate to="/home" replace />

  return (
    <div className="bg-background grid min-h-svh place-items-center p-6">
      <LoginForm />
    </div>
  )
}
```

**`components/auth/login/LoginForm.tsx`** — pure UI, 54 lines:

```tsx
export function LoginForm() {
  const { email, password, error, onEmailChange, onPasswordChange, onSubmit } = useLoginForm()
  // renders Card + Input + Label + Button only
}
```

Rules that follow from this split:

- Page files **never** own large JSX trees or form state.
- Feature components **never** call `fetch`, `useAppDispatch`, or `useNavigate` directly — delegate to the feature hook.
- No API calls anywhere inside `.tsx` files — all calls go through `src/api/<domain>/` modules.

---

## Feature Hooks

Feature hooks live at `src/components/<domain>/<feature>/hooks/use<Feature>.ts`.
Use shared hooks (`src/hooks/<domain>/`) only when logic is consumed by more than one feature.

### Contract pattern

Every feature hook returns a named, typed result interface owned by `src/types/<domain>/<feature>-ui.ts`.

**`src/types/auth/login-ui.ts`** (the type file):

```ts
export interface UseLoginFormResult {
  email: string
  password: string
  error: string | null
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
}
```

**`useLoginForm.ts`** — what a feature hook looks like:

```ts
export function useLoginForm(): UseLoginFormResult {
  const dispatch  = useAppDispatch()   // typed hook only — never raw useDispatch
  const navigate  = useNavigate()
  const location  = useLocation()

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError("Enter both email and password."); return }
    // mock: any non-empty creds → loginSuccess (intentional dev decision)
    dispatch(loginSuccess({ user: { name: email, email, role: "user" }, token: "dev-token" }))
    navigate(from, { replace: true })
  }
  // ...returns UseLoginFormResult
}
```

Hook rules (from `react-hooks-patterns`):

- Prefer `useState` for field-level state; escalate to `useReducer` when 3+ related fields change together.
- Do **not** store derived state that can be computed from current inputs.
- Effect cleanup must be explicit when a hook subscribes to external resources.
- Extract a custom hook when inline logic exceeds ~20 lines or needs reuse.

---

## Performance — Memoization

Apply `React.memo`, `useMemo`, and `useCallback` only where behavior justifies it, not as a default.

| Tool | When to apply |
|---|---|
| `React.memo` | A feature component re-renders frequently from a parent that changes unrelated state |
| `useMemo` | An expensive derived value (e.g., filtered/sorted dataset) is computed on every render |
| `useCallback` | A callback is passed as a prop to a memoized child and its identity matters |

Anti-patterns to avoid:

- Wrapping every component in `React.memo` (adds overhead, obscures intent).
- `useMemo(() => items.filter(...), [items])` when the component only renders a handful of items — premature.
- Large inline arrow functions in JSX — extract and `useCallback` if the child is memoized.

For future data-heavy screens (customer lists, stock tables): use server-side pagination via `api/` modules; never client-side filter or sort server data in the browser.

---

## 250-Line Decomposition

Every hand-maintained `src/` file must stay under 250 lines (`frontend-structure-standards` §12).

Decomposition ladder — apply in order when a file grows:

1. **Extract a sub-component** — isolate a self-contained UI region into `components/<domain>/<feature>/<SubPart>.tsx`.
2. **Extract a feature hook** — move state + handlers to `hooks/use<Feature>.ts`.
3. **Extract a type file** — move prop/state interfaces to `types/<domain>/<feature>-ui.ts` (never define `interface Props` inline in `.tsx`).
4. **Extract a utility** — move pure helpers to `src/utils/` or `src/lib/`.
5. **Split API module** — if the feature has >1 backend call, give each its own file under `src/api/<domain>/`.

Do **not** add new behavior to a file that already exceeds 250 lines without first refactoring it.

---

## Design Token Discipline

- Use only semantic tokens (`--primary`, `--destructive`, `--muted-foreground`, `--background`, …) — never raw hex.
- JSW brand tokens (`--jsw-blue`, `--jsw-red`, `--jsw-steel`) are **not yet defined**. Add them to `src/index.css` (`:root`/`.dark`) before referencing.
- Contrast floor: 4.5:1 for body text, 3:1 for large text (WCAG 2.1 AA).
- Tailwind v4 only — no `tailwind.config.js`; use CSS variables in `index.css`.

---

## Type Ownership Quick-Reference

| What | Where |
|---|---|
| Feature prop / return contracts | `src/types/<domain>/<feature>-ui.ts` |
| API request/response shapes | `src/types/api/` |
| Auth / session models | `src/types/auth/` |
| Store-facing types | `src/types/<domain>/` |
| No inline `interface Props` | Enforced — move to type file |

---

## Adding a New Feature — Checklist

```
src/
  api/<domain>/<action>.ts          ← API call (one per file)
  components/<domain>/<feature>/
    <Feature>.tsx                   ← feature component (UI only)
    hooks/
      use<Feature>.ts               ← feature hook (state + dispatch)
  pages/<domain>/<route>/
    index.tsx                       ← route page (thin orchestrator)
  store/<domain>/
    slice.ts                        ← Redux slice (global state only)
    selectors.ts
  types/<domain>/
    <feature>-ui.ts                 ← prop/hook contracts
    <domain>.ts                     ← domain models
```

Import types with `import type` (TypeScript `verbatimModuleSyntax` is active).
Use `useAppDispatch` / `useAppSelector` — never raw `useDispatch` / `useSelector`.
