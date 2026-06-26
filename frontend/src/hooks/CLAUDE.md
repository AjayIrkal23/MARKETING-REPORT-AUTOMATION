<!-- dox:child v1 -->
# `frontend/src/hooks/` — Shared custom hooks

Cross-cutting React hooks used by multiple features.

## What lives here

Generic hooks that are not tied to a single domain. Domain-specific hooks belong under `src/components/<domain>/hooks/` instead.

## Local conventions

- Keep hooks domain-agnostic; move feature hooks to the feature folder.
- Name files `use<Name>.ts`.

## Key files

| File | Role |
|------|------|
| `use-mobile.ts` | Detects mobile breakpoint via `useMediaQuery`. |
| `usePersistedState.ts` | localStorage-backed state with a sliding TTL (default 1h). Exports `loadPersisted`/`savePersisted` primitives + a `usePersistedState` hook. Used by the JSW/JVML/Credit list hooks + the Report hook + `ReportSection` so page filters/date/generated report survive navigation, resetting only after >1h idle. |

## Gotchas / fragile spots

- This folder is intentionally small — prefer colocating hooks with their feature.
- `usePersistedState`: prefer the `useState(() => loadPersisted(...))` + save-`useEffect` form when the setter is fed into a `useCallback` dep array — eslint's `exhaustive-deps` only treats a real `useState` setter as stable, not one returned from the hook. Use the `usePersistedState` hook form only when the setter isn't a dependency (e.g. `ReportSection`'s tab).

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../frontend_docs/COMPONENTS.md`](../../../frontend_docs/COMPONENTS.md)
