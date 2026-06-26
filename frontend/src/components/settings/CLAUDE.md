<!-- dox:child v1 -->
# `frontend/src/components/settings/` — Settings UI

Components for the admin Settings page.

## What lives here

Scheduler config cards for JSW Stock, JVML Stock, and Credit Report ingestion,
plus the **Ingestion Folder Cleanup** card. Each card owns its hook internally.

## Local conventions

- The three stock/credit cards render via the domain-agnostic `StockConfigPanel`;
  `config-domains.ts` defines the descriptor for each.
- `CleanupConfigCard` is **standalone** (different shape — enable + retention +
  run-hour + last-run readout — no path/file/window/emails), not driven by
  `StockConfigPanel`.
- Credit Report embeds zone-level Run buttons inside its existing config card;
  JSW/JVML keep the global Run check button.

## Key files

| File | Role |
|------|------|
| `JswStockConfigCard.tsx` | JSW Stock scheduler config card. |
| `JvmlStockConfigCard.tsx` | JVML Stock scheduler config card. |
| `CreditReportConfigCard.tsx` | Credit Report scheduler config card. |
| `CleanupConfigCard.tsx` | Ingestion folder cleanup config card (standalone; sits beside Credit Report in the grid). |
| `CreditReportZonesPanel.tsx` | Inline active-region zone statuses and per-zone Run buttons for Credit Report. |
| `StockConfigPanel.tsx` | Domain-agnostic config/status/run-now UI. |
| `StockLastRun.tsx` | Last-run status display. |
| `ResolvedPathPreview.tsx` | Preview of the resolved file path. |
| `config-domains.ts` | Domain descriptors (`JSW_DOMAIN`, etc.). |
| `hooks/useJswStockConfig.ts` | JSW config/status/run-now state. |
| `hooks/useJvmlStockConfig.ts` | JVML config/status/run-now state. |
| `hooks/useCreditReportConfig.ts` | Credit Report config/status/run-now state. |
| `hooks/useCleanupConfig.ts` | Cleanup config + run-now state (no separate status endpoint). |

## Gotchas / fragile spots

- The page grid is `lg:grid-cols-2` — 2 cards per row.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)
