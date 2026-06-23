<!-- dox:child v1 -->
# `backend/app/services/audit_log/` — Audit log read services

Paginated listing, detail lookup, async options, and filter facets for the
admin audit-log viewer.

## What lives here

Read-only services over the `audit_logs` collection. The controllers gate these
endpoints with `get_current_admin`.

## Local conventions

- Use `utils/audit_log/query.py` for filter and sort construction.
- Return `(list[DTO], PaginationMeta)` from list services.
- Serialization helpers convert `AuditLog` documents to public/detail DTOs.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Aggregates public exports (`list_audit_logs`, `get_audit_log`, options, serializers). |
| `list.py` | Paginated, filtered, sorted audit-log list. |
| `get.py` | Single audit-log entry by ObjectId. |
| `options.py` | Async combobox options and filter facet enums. |
| `serialize.py` | `AuditLog` → `AuditLogPublic` / `AuditLogDetail` mappers. |

## Gotchas / fragile spots

- `options.py` blends distinct values from `actor_email`, `path`, and `action`;
  keep the per-source cap balanced so one field does not starve the others.
- Facet `categories`, `outcomes`, and `sources` are static Literals; `methods`,
  `statuses`, and `actions` are derived from the collection.
- Unknown query keys are rejected by the controller whitelist, not here.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/API_CONTRACT.md`](../../../backend_docs/API_CONTRACT.md)
