<!-- dox:child v1 -->
# `frontend/src/components/shared/` — App-wide shared components

Reusable components not tied to a single feature.

## What lives here

Small, app-level UI pieces used by multiple features. Larger domain-agnostic inputs live in `components/common/` instead.

## Local conventions

- Keep this folder small; prefer colocating components with their feature.

## Key files

| File | Role |
|------|------|
| `PageLoading.tsx` | Full-viewport centered loading spinner with optional message. |

## Gotchas / fragile spots

- Do not add feature-specific logic here.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)
