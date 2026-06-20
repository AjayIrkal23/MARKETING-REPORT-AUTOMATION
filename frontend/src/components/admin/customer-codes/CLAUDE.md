<!-- dox:child v1 -->
# `frontend/src/components/admin/customer-codes/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

React components, hooks, and UI types for the admin **Customer Code Management**
screen. All backend communication is delegated to `src/api/admin/customer-codes/*`.

## Local conventions

- One file per concern: table, toolbar, filters, dialogs, sheet, hooks, badges,
  row actions.
- Components are presentational; state lives in `useCustomerCodeManagement`.
- All filtering, sorting, and pagination is server-driven — no client-side
  filtering of server data.
- Per-field filters use a single `setFilter` callback (no individual setters)
  and reset page to 1 automatically.
- Dialog state is a discriminated union (`CustomerCodeDialogState`).
- Form fields are shared via `CustomerCodeFormFields` to keep create/edit
  dialogs under 250 lines.
- The `q` search combobox searches across all text fields; per-field async
  comboboxes fetch distinct options from the backend.

## Key files

| File | Role |
|------|------|
| `CustomerCodeTable.tsx` | Server-driven sortable table with row-selection checkboxes and Ship-To City / Transport Mode columns. |
| `CustomerCodeTableToolbar.tsx` | Search + region filter + per-field filters + Delete selected button; wires to hook setters. |
| `CustomerCodeFilters.tsx` | Inline async-combobox filters for segment/code/customer/destination/CAM/MOB/Ship-To City/Rake/Transport Mode. |
| `CustomerCodeFormFields.tsx` | Shared form grid for create/edit with 4 required + 11 optional fields. |
| `CreateCustomerCodeDialog.tsx` | Upsert create dialog (natural key is `code + ship_to + region_id`). |
| `EditCustomerCodeDialog.tsx` | Partial update dialog; sends only changed fields. |
| `ViewCustomerCodeSheet.tsx` | Read-only detail sheet including the second ship-to and logistics columns. |
| `ImportCustomerCodesDialog.tsx` | Excel upload + import result summary. |
| `ImportResultSummary.tsx` | Post-import stat grid showing inserted, updated, skipped, and errors. |
| `RowActionsMenu.tsx` | View / edit / delete actions per row. |
| `SegmentBadge.tsx` | Case-insensitive segment badge. |
| `hooks/useCustomerCodeManagement.ts` | Query state, fetch effect, single `setFilter`, clear filters, dialog state, row selection (current page). |
| `hooks/useCustomerCodeMutations.ts` | Delete mutation + loading/error handling. |

## Gotchas / fragile spots

- Region filter query key is `region` (not `region_id`) — the backend maps it
  internally.
- `CustomerCodeFiltersProps` must stay in sync with the hook's filter keys and
  the toolbar's prop forwarding.
- The Export button calls a raw `fetch` (binary `.xlsx`) via
  `api/admin/customer-codes/export`; it is not routed through the JSON envelope
  client.
- Import summary now shows an `updated` count; the backend returns `updated` for
  re-imports that match the natural key.
- Row selection is local to the current page and cleared whenever the fetched
  rows change (page/filter/sort/refetch). The Delete selected button opens a
  confirmation dialog and calls `POST /admin/customer-codes/bulk-delete`.
- The bulk-delete endpoint accepts up to 100 ids and returns the number of
  documents actually deleted; invalid ids are ignored.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../macro_docs/west-central-customer-codes.md`](../../../macro_docs/west-central-customer-codes.md)
