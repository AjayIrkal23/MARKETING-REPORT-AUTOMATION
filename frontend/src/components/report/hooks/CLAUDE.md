<!-- dox:child v1 -->
# `frontend/src/components/report/hooks/` — Report hooks

Feature hooks for the Report JSW/JVML page.

## What lives here

Contains `useReport`, which owns all page state: inputs, generation trigger, export, and optional column visibility.

## Local conventions

- Generation is manual — do not auto-fetch on input change.
- Column visibility is the only client-side view config.

## Key files

| File | Role |
|------|------|
| `useReport.ts` | All Report page state + generate/export. |

## Gotchas / fragile spots

- The pivot relies on backend sort order for client-side grouping.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
