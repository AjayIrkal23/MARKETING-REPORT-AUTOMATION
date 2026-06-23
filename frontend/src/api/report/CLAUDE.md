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
| `export.ts` | `GET /report/export` — binary `.xlsx` download. |

## Gotchas / fragile spots

- `region_id` is optional; coerce empty values to `undefined` before `buildQuery`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/API_LAYER.md`](../../../../frontend_docs/API_LAYER.md)
