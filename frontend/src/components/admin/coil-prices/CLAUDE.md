<!-- dox:child v1 -->
# `frontend/src/components/admin/coil-prices/` — Coil config UI

Components for the admin Coil Config page.

## What lives here

A compact card-based page hosting the per-coil-price section. Each entry is a `{ quantity, price }` pair with an `active` flag.

## Local conventions

- No full table-page treatment — the section is intentionally compact.
- Money display uses INR `toLocaleString('en-IN')` with a `₹` prefix.

## Key files

| File | Role |
|------|------|
| `PerCoilPriceSection.tsx` | Card wrapping the coil price list. |
| `CoilPriceTable.tsx` | Small server-driven table with inline actions. |
| `CreateCoilPriceDialog.tsx` | Create dialog. |
| `EditCoilPriceDialog.tsx` | Edit dialog. |
| `hooks/useCoilPrices.ts` | List fetch and delete mutation. |

## Gotchas / fragile spots

- The list fetches `limit=100` with no pagination UI — confirm backend size stays small.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
