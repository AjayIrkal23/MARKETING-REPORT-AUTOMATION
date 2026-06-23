<!-- dox:child v1 -->
# `frontend/src/components/settings/` — Settings UI

Components for the admin Settings page.

## What lives here

Scheduler config cards for JSW Stock, JVML Stock, and Credit Report ingestion. Each card owns its hook internally.

## Local conventions

- Cards are rendered via the domain-agnostic `StockConfigPanel`.
- `config-domains.ts` defines the descriptor for each domain.

## Key files

| File | Role |
|------|------|
| `JswStockConfigCard.tsx` | JSW Stock scheduler config card. |
| `JvmlStockConfigCard.tsx` | JVML Stock scheduler config card. |
| `CreditReportConfigCard.tsx` | Credit Report scheduler config card. |
| `StockConfigPanel.tsx` | Domain-agnostic config/status/run-now UI. |
| `StockLastRun.tsx` | Last-run status display. |
| `ResolvedPathPreview.tsx` | Preview of the resolved file path. |
| `config-domains.ts` | Domain descriptors (`JSW_DOMAIN`, etc.). |
| `hooks/useJswStockConfig.ts` | JSW config/status/run-now state. |
| `hooks/useJvmlStockConfig.ts` | JVML config/status/run-now state. |
| `hooks/useCreditReportConfig.ts` | Credit Report config/status/run-now state. |

## Gotchas / fragile spots

- The page grid is `lg:grid-cols-2` — 2 cards per row.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)
