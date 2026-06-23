<!-- dox:child v1 -->
# `frontend/src/pages/admin/coil-config/` — Coil config page

`/admin/coil-config` route page.

## What lives here

Compact admin page hosting the `PerCoilPriceSection` card. Built to allow more config sections on the page later.

## Local conventions

- Keep page layout minimal; sections own their own state.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Coil Config page component. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)
