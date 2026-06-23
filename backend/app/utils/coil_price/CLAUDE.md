<!-- dox:child v1 -->
# `backend/app/utils/coil_price/` — Coil price query helpers

MongoDB filter and sort construction for the coil price list.

## What lives here

Pure functions that translate validated `CoilPriceListQuery` DTOs into filter
documents and sort tokens.

## Local conventions

- Add `active` as an exact `bool` predicate only when the caller supplied it.
- `build_sort` assumes `sort_by` is whitelisted by the schema.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `query.py` | `build_coil_price_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- No free-text search; the only filter is `active`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
