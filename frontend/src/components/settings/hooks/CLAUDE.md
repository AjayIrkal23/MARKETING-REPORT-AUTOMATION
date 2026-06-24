<!-- dox:child v1 -->
# `frontend/src/components/settings/hooks/` — Settings hooks

Feature hooks for the admin Settings page.

## What lives here

Contains one hook per ingestible domain (`useJswStockConfig`, `useJvmlStockConfig`, `useCreditReportConfig`). Each loads config + status, saves config, and triggers run-now.

## Local conventions

- Each hook is self-contained and consumed by a single card.
- Save triggers a status refresh to reflect scheduler changes.
- `useCreditReportConfig` also exposes `runZoneNow(regionId)` and
  `runningZoneId` for the inline zone buttons.

## Key files

| File | Role |
|------|------|
| `useJswStockConfig.ts` | JSW Stock config/status/run-now. |
| `useJvmlStockConfig.ts` | JVML Stock config/status/run-now. |
| `useCreditReportConfig.ts` | Credit Report config/status/run-now. |

## Gotchas / fragile spots

- Keep the three hooks structurally identical so the shared panel can treat them uniformly.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
