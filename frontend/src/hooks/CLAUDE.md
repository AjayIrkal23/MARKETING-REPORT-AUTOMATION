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

## Gotchas / fragile spots

- This folder is intentionally small — prefer colocating hooks with their feature.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../frontend_docs/COMPONENTS.md`](../../../frontend_docs/COMPONENTS.md)
