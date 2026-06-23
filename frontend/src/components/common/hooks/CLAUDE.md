<!-- dox:child v1 -->
# `frontend/src/components/common/hooks/` — Shared component hooks

Domain-agnostic hooks for shared components.

## What lives here

Contains `useAsyncOptions`, the debounced, race-safe hook backing async comboboxes across the app.

## Local conventions

- The fetcher is injected; this hook is purely about request lifecycle.
- Stale responses are discarded via `AbortController`.

## Key files

| File | Role |
|------|------|
| `useAsyncOptions.ts` | Debounced option fetch with race safety. |

## Gotchas / fragile spots

- Default debounce is 300 ms; pass a different value only after UX review.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
