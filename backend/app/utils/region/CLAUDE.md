<!-- dox:child v1 -->
# `backend/app/utils/region/` — Region query helpers

MongoDB filter and sort construction for the region list.

## What lives here

Pure functions that translate validated `RegionListQuery` DTOs into filter
documents and sort tokens.

## Local conventions

- Escape free-text input with `re.escape`.
- `q` searches both `name` and the `emails` array via `$or`.
- Add `active` as an exact `bool` predicate only when supplied.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Package docstring. |
| `query.py` | `build_region_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- A `$regex` against an array field matches any element; no `$elemMatch` is needed.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
