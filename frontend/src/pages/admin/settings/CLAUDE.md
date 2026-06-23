<!-- dox:child v1 -->
# `frontend/src/pages/admin/settings/` — Settings page

`/admin/settings` route page.

## What lives here

Admin page rendering the JSW Stock, JVML Stock, and Credit Report scheduler config cards in a responsive grid.

## Local conventions

- Cards are self-contained; the page only handles layout.
- Grid is `lg:grid-cols-2`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Settings page component with config cards. |

## Gotchas / fragile spots

- Route is guarded by `AdminRoute`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)
