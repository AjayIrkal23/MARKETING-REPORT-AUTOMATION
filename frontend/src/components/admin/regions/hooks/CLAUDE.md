<!-- dox:child v1 -->
# `frontend/src/components/admin/regions/hooks/` — Region management hooks

Feature hooks for the Region Management page.

## What lives here

Contains `useRegionManagement` (list/dialog state) and `useRegionMutations` (create/update/delete).

## Local conventions

- List query state and mutations are split across two hooks.

## Key files

| File | Role |
|------|------|
| `useRegionManagement.ts` | Query/server/dialog state. |
| `useRegionMutations.ts` | Create/update/delete mutations. |

## Gotchas / fragile spots

- Keep `EmailChipInput` logic out of these hooks — it is a presentational component.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)
