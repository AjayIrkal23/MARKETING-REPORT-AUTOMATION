<!-- dox:child v1 -->
# `frontend/src/types/settings/` — Settings domain types

TypeScript types for scheduler config features.

## What lives here

Contains config, input, status, and UI types for JSW Stock, JVML Stock, and Credit Report ingestion schedulers.

## Local conventions

- Each domain has its own config/status file pair.
- Config objects are singletons and have no `id`.
- Credit Report status carries `zones[]` and `dup_party_count` in addition to
  the shared last-run fields.

## Key files

| File | Role |
|------|------|
| `jsw-stock-config.ts` | JSW Stock config and status types. |
| `jsw-stock-config-ui.ts` | JSW Stock config hook result types. |
| `jvml-stock-config.ts` | JVML Stock config and status types. |
| `credit-report-config.ts` | Credit Report config and status types. |
| `credit-report-config-ui.ts` | Credit Report settings hook UI contract. |

## Gotchas / fragile spots

- Time fields are 24h `HH:MM` strings; interval is whole hours 1–24.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)
