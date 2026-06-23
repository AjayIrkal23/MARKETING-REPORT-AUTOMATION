<!-- dox:child v1 -->
# `frontend/src/components/common/` — Shared UI components

Reusable, domain-agnostic input components.

## What lives here

Async comboboxes, date pickers, and filter primitives used across multiple list pages. These are presentational and delegate data fetching to caller hooks.

## Local conventions

- Keep components generic — no domain types here.
- Date formats are explicit (`dd-MM-yyyy` for report dates).

## Key files

| File | Role |
|------|------|
| `AsyncCombobox.tsx` | Debounced searchable combobox with loading states. |
| `FilterCombobox.tsx` | Pre-configured filter combobox wrapper. |
| `DatePicker.tsx` | Single-date picker emitting `dd-MM-yyyy`. |
| `DateRangePicker.tsx` | Date-range picker for audit-log style filters. |
| `hooks/useAsyncOptions.ts` | Debounced, race-safe option fetching. |

## Gotchas / fragile spots

- `DatePicker` (single) and `DateRangePicker` are different components — pick the right one.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../frontend_docs/COMPONENTS.md`](../../../../frontend_docs/COMPONENTS.md)
