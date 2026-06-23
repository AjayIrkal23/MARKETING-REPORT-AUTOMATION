<!-- dox:child v1 -->
# `backend/app/utils/user/` — User query helpers

MongoDB filter and sort construction for the authenticated user list.

## What lives here

Pure functions that translate validated `UserListQuery` DTOs into filter
documents and sort tokens.

## Local conventions

- Escape free-text input with `re.escape` before applying `$regex`.
- `q` does a case-insensitive substring match on `emailid`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `query.py` | `build_user_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- `build_sort` assumes `sort_by` has already been whitelisted by the schema.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
