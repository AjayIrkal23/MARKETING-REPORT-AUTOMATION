<!-- dox:child v1 -->
# `frontend/src/api/report/` — Report JSW/JVML API

HTTP wrappers for the `/report` endpoints.

## What lives here

On-demand generation and export of the Coil Stock RAKE pivot report with credit-report checks.

## Local conventions

- Generation is heavy and triggered manually — do not auto-fetch.
- Export uses raw `fetch` for binary `.xlsx` download.

## Key files

| File | Role |
|------|------|
| `generate.ts` | `GET /report/generate` — pivot + credit payload. |
| `export.ts` | `exportCombined(params)` → `GET /report/export-combined` — binary multi-sheet `.xlsx` download (chosen `sheets` + optional-column `columns` CSV). Replaces the removed `exportReport` / `exportRakeTotals`. |
| `rake-drilldown.ts` | `GET /report/rake-drilldown` — individual jsw + jvml rows for one RAKE (always both collections). |

## Gotchas / fragile spots

- `region_id` is optional; coerce empty values to `undefined` before `buildQuery`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)
