<!-- dox:child v1 -->
# `frontend/src/components/` — React components

All React components, grouped by domain.

## What lives here

Components are organized by feature (`admin/`, `auth/`, `jsw-stock/`, etc.) with shared primitives under `ui/` (shadcn), `common/`, `layout/`, `theme/`, and `shared/`. Pages in `src/pages/` import and wire these components.

## Local conventions

- One file per concern; split files that exceed 200 lines.
- No API calls inside components — use dedicated feature hooks.
- Use shadcn primitives from `ui/`; do not fork Radix directly.

## Key files

| File | Role |
|------|------|
| `ui/` | ~55 shadcn/ui primitive components. |
| `layout/` | DashboardLayout, AppSidebar, navigation items. |
| `common/` | Shared filter/date components and hooks. |
| `admin/` | Admin-only management screens. |
| `jsw-stock/` | JSW Stock List read-only UI. |
| `report/hooks/useReport.ts` | Report page state hook. |

## Gotchas / fragile spots

- Check `frontend/CLAUDE.md` for the verified `src/` tree before assuming a component exists.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`admin/`](admin/CLAUDE.md) · [`auth/`](auth/CLAUDE.md) · [`common/`](common/CLAUDE.md) · [`credit-report/`](credit-report/CLAUDE.md) · [`dashboard/`](dashboard/CLAUDE.md) · [`jsw-stock/`](jsw-stock/CLAUDE.md) · [`jvml-stock/`](jvml-stock/CLAUDE.md) · [`layout/`](layout/CLAUDE.md) · [`report/`](report/CLAUDE.md) · [`settings/`](settings/CLAUDE.md) · [`shared/`](shared/CLAUDE.md) · [`theme/`](theme/CLAUDE.md) · [`ui/`](ui/CLAUDE.md)
- Related repo docs: [`../../../frontend_docs/COMPONENTS.md`](../../../frontend_docs/COMPONENTS.md)
