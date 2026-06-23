<!-- dox:child v1 -->
# `frontend/src/pages/report/` — Report JSW/JVML page

`/report` route page.

## What lives here

Thin orchestrator for the Coil Stock RAKE pivot report with credit checks. Wires `useReport` to the toolbar and pivot table.

## Local conventions

- Report is fetched on demand via the Generate button.
- Page handles idle/loading/no-stock/no-credit states.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Report JSW/JVML page component. |

## Gotchas / fragile spots

- Do not auto-fetch the report on input change — the join is heavy.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/ROUTING.md`](../../../../frontend_docs/ROUTING.md)
