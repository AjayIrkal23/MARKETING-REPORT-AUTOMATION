<!-- dox:child v1 -->
# `backend/app/utils/audit_log/` — Audit log query helpers

MongoDB filter and sort construction for the audit-log list.

## What lives here

Pure functions that translate validated `AuditLogListQuery` DTOs into filter
documents and sort tokens for the `audit_logs` collection.

## Local conventions

- Escape all free-text input with `re.escape`.
- Normalize `method` to uppercase before matching.
- Combine `dateFrom`/`dateTo` into a single `timestamp` range predicate.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `query.py` | `build_audit_filter()` and `build_sort()`. |

## Gotchas / fragile spots

- `q` searches `path`, `summary`, `action`, and `actor_email` via `$or`.
- The `actor` filter is a partial case-insensitive match on `actor_email`.
- `build_sort` assumes `sort_by` has already been whitelisted by the schema.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
