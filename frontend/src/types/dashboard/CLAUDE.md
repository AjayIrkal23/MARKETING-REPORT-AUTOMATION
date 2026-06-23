<!-- dox:child v1 -->
# `frontend/src/types/dashboard/` — Dashboard domain types

TypeScript types for the dashboard page.

## What lives here

Contains the ingestion summary contract returned by `/dashboard/summary`.

## Local conventions

- Summary types mirror the backend dashboard service schema.

## Key files

| File | Role |
|------|------|
| `summary.ts` | Dashboard summary response type. |

## Gotchas / fragile spots

- Add analytics types here as the dashboard grows.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)
