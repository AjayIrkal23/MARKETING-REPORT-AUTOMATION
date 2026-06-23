<!-- dox:child v1 -->
# `frontend/src/components/admin/regions/` — Region management UI

Components for the admin Region Management page.

## What lives here

Server-driven table, toolbar, dialogs, and detail sheet for sales regions. State lives in `hooks/useRegionManagement.ts` and mutations in `hooks/useRegionMutations.ts`.

## Local conventions

- Regions own a notification email list edited via `EmailChipInput`.
- Dialog state is a discriminated union.

## Key files

| File | Role |
|------|------|
| `RegionTable.tsx` | Sortable server-driven table. |
| `RegionTableToolbar.tsx` | Search + active filter + create button. |
| `RegionTablePagination.tsx` | Page/limit controls. |
| `CreateRegionDialog.tsx` | Create dialog. |
| `EditRegionDialog.tsx` | Edit dialog. |
| `ViewRegionSheet.tsx` | Read-only detail sheet. |
| `EmailChipInput.tsx` | Shared chip input for email lists. |
| `RegionActiveBadge.tsx` | Active/inactive badge. |
| `hooks/useRegionManagement.ts` | List query state and dialog state. |
| `hooks/useRegionMutations.ts` | CRUD mutations. |

## Gotchas / fragile spots

- `EmailChipInput` is reused by the Settings config cards — keep it region-agnostic.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
