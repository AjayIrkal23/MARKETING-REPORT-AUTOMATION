<!-- dox:child v1 -->
# `backend/app/utils/report/` — Report cross-domain helpers

Shared utilities used by the RAKE pivot report and ingestion pipelines.

## What lives here

Normalization logic that must stay consistent across stock, customer-code, and
credit-report domains.

## Local conventions

- Keep functions pure and deterministic.
- Reuse helpers from here in pollers so ingest-time and report-time joins agree.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `normalize.py` | `normalize_code()` — canonical SAP code (strip leading zeros). |

## Gotchas / fragile spots

- `normalize_code` returns `None` for empty or all-zero input; callers must handle
  that case explicitly.
- Stock pollers store `party_code_normalized` using this exact function.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`macro_docs/README.md`](../../../../macro_docs/README.md)
