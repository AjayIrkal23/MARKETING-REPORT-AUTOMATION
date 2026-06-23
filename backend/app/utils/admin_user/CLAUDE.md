<!-- dox:child v1 -->
# `backend/app/utils/admin_user/` — Admin user query helpers

MongoDB filter and sort construction for the admin user list.

## What lives here

Pure functions that translate validated `AdminUserListQuery` DTOs into Beanie/
MongoDB filter documents and sort tokens.

## Local conventions

- Escape all user input with `re.escape` before using it in `$regex`.
- Treat `status="all"` and `role="all"` as no-op filters.
- Map `role="admin"`/`"user"` to `isAdmin=True`/`False`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `query.py` | `build_admin_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- `q` searches both `name` and `emailid` via `$or`.
- `build_sort` assumes `sort_by` has already been whitelisted by the schema.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
