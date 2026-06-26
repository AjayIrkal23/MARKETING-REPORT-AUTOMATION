# Persist Page State Across Navigation — Implementation Plan

> **For agentic workers:** drop-in `useState` replacement backed by localStorage with a sliding 1-hour TTL. No new dependencies.

**Goal:** Filters, selected date, generated-report data, column toggles and active tab on JSW Stock, JVML Stock, Credit Report and Report pages survive navigation away-and-back. State is reset only after the page hasn't been touched/viewed for more than 1 hour.

**Architecture:** All four pages keep their state in component-local `useState` inside per-page hooks; react-router unmounts pages on navigation → state is lost (and the three list hooks also re-seed `date` to today on every mount). Fix lifts the *durable* slices out of `useState` into a single shared `usePersistedState` hook that mirrors `useState`'s API but persists to `localStorage` keyed per page, stamping each write with a timestamp and discarding entries older than 1 hour. Viewing the page within the window slides the expiry forward.

**Tech Stack:** React 19, TypeScript, Vite, `date-fns` (already present). No Redux change, no new libs.

## Global constraints (from CLAUDE.md)
- Frontend file ≤ 250 lines; types in `src/types/<domain>/`; semantic tokens; no client-side filtering of server data.
- Don't suppress the mandatory FE craft-skill hooks.

## Decisions
- **localStorage, not sessionStorage** — the reset rule is purely time-based (>1h), so state should survive a tab close / reload within the hour. sessionStorage would wipe on tab close regardless of the clock.
- **Sliding TTL (refreshed on every write *and* on mount-if-present)** — matches "reset only if away > 1 hour". Fixed-from-last-write would drop a report you're still actively coming back to.
- **List pages persist only `query`** (date/filters/page/limit/sort/region). `rows`/`meta` are NOT persisted — the existing `useEffect` refetches from the restored `query` on remount, giving fresh data with no stale flash.
- **Report page persists `inputs`, `data` (the generated payload), `visibleCols`** — it has no auto-refetch, so the generated result itself must be stored.
- **`format(new Date(),"dd-MM-yyyy")` stays as the default** passed to `usePersistedState` → used only when nothing fresh is stored, so "open on today" still holds for a cold page.
- Ephemeral state (`loading`, `error`, `exporting`, `dialog`, `fetchIdRef`) stays in plain `useState`/`useRef` — must reset on navigation.

## File structure
- **Create** `frontend/src/hooks/usePersistedState.ts` — the shared util (~45 lines).
- **Modify** `frontend/src/components/jsw-stock/hooks/useJswStockList.ts` — `query` → persisted.
- **Modify** `frontend/src/components/jvml-stock/hooks/useJvmlStockList.ts` — `query` → persisted.
- **Modify** `frontend/src/components/credit-report/hooks/useCreditReportList.ts` — `query` → persisted.
- **Modify** `frontend/src/components/report/hooks/useReport.ts` — `inputs`, `data`, `visibleCols` → persisted.
- **Modify** `frontend/src/components/report/ReportSection.tsx` — make `Tabs` controlled by a persisted active-tab value.

## Tasks

### Task 1: `usePersistedState` shared hook
`useState`-compatible tuple `[T, (next: T | (prev:T)=>T) => void]`. Reads localStorage on init; if entry missing/corrupt/older than `ttlMs` → returns `initial` (clearing the stale key). Writes `{v, t:Date.now()}` on every set. A mount-effect slides the timestamp forward when a live entry exists. Default `ttlMs = 60*60*1000`. All localStorage access wrapped in try/catch (SSR/quota/private-mode safe). Ships with an `assert`-based `__demo` self-check that fails if expiry / round-trip logic breaks.

### Task 2: JSW + JVML + Credit list hooks
Replace `const [query, setQuery] = useState<…>(() => ({...DEFAULT_QUERY, date: today}))` with `usePersistedState<…>("mra:<page>:query", () => ({...DEFAULT_QUERY, date: today}))`. Keys: `mra:jsw-stock:query`, `mra:jvml-stock:query`, `mra:credit-report:query`. No other change — setters and the refetch `useEffect` are unchanged (functional updates supported).

### Task 3: Report hook
`inputs` → `usePersistedState("mra:report:inputs", () => ({...today...}))`; `data` → `usePersistedState<ReportResponse|null>("mra:report:data", null)`; `visibleCols` → `usePersistedState("mra:report:cols", () => ({...DEFAULT_REPORT_COLS}))`. `generate()`/`exportReport()`/`toggleCol()` unchanged.

### Task 4: Report active tab
`ReportSection`: replace `<Tabs defaultValue="branch">` with controlled `value`/`onValueChange` from `usePersistedState<"branch"|"rake">("mra:report:tab", "branch")`.

### Checkpoint
- [ ] `npm run build` (tsc -b && vite build) passes.
- [ ] `npm run lint` clean.
- [ ] Manual: set filters/date on each page → navigate away → back → state intact; generate report → navigate away → back → report still shown; wait >1h (or hand-edit the stored `t`) → state resets to defaults.

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| `data` payload large for localStorage 5 MB cap | Low | Pivot payloads are small; writes are try/caught so a quota error silently no-ops (state still works in-session). `ponytail:` comment notes the ceiling. |
| Stored shape drifts when query/inputs types change later | Low | Reads are defensive; a shape mismatch just renders odd filters until cleared. Bump the key suffix if a breaking field change lands. |
| Two tabs writing same keys | Low | Last-write-wins; acceptable for per-user view state. |
