<!-- dox:child v1 -->
# `frontend/src/components/layout/` — Layout components

Shell components for authenticated pages.

## What lives here

Dashboard layout, sidebar, navbar, and user menu. These wrap all protected routes inside `DashboardLayout`.

## Local conventions

- Layout components read auth state for the user menu.
- Navigation items are defined in `nav-items.ts` and split into user + admin groups.
- A `NavItem` may carry `children: NavChild[]` (and omit `to`) to render as a
  collapsible group. "Stock List" uses this — its JSW (`/jsw-stock`) and JVML
  (`/jvml-stock`) sub-items render via shadcn `Collapsible` + `SidebarMenuSub`.
  Routes are unchanged; only the sidebar grouping is. `titleForPath` flattens
  children, so a sub-item's label resolves the navbar title.

## Key files

| File | Role |
|------|------|
| `DashboardLayout.tsx` | Authenticated page shell with sidebar inset. |
| `AppSidebar.tsx` | Collapsible navigation sidebar. |
| `DashboardNavbar.tsx` | Top navbar with page title and user menu. |
| `UserMenu.tsx` | Logout and theme toggle dropdown. |
| `nav-items.ts` | `NAV_ITEMS`, `ADMIN_NAV_ITEMS`, and `titleForPath`. |

## Gotchas / fragile spots

- The `min-w-0` on `SidebarInset` and `<main>` prevents horizontal overflow in wide tables.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)
