<!-- dox:child v1 -->
# `frontend/src/pages/admin/regions/` — Region management page

`/admin/regions` route page.

## What lives here

Thin orchestrator for the Region Management screen: table, toolbar, dialogs, and detail sheet.

## Local conventions

- All state comes from `useRegionManagement` and `useRegionMutations`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Region Management page component. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)
