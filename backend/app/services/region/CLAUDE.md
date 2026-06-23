<!-- dox:child v1 -->
# `backend/app/services/region/` — Region management

CRUD and listing services for notification/distribution regions.

## What lives here

Business logic for the `regions` collection. Admin controllers gate these
operations with `get_current_admin`.

## Local conventions

- One action per file (`create.py`, `update.py`, `delete.py`, `get.py`, `list.py`,
  `options.py`).
- Enforce case-insensitive name uniqueness at the service layer.
- Return `RegionPublic` DTOs via `serialize.py`.
- Emit `regions` audit events on mutations.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `create.py` | Insert a region with name-uniqueness check. |
| `delete.py` | Hard-delete a region. |
| `get.py` | Fetch a single region. |
| `list.py` | Backend-driven paginated list. |
| `options.py` | Async combobox search over region names. |
| `serialize.py` | Document → `RegionPublic` mapper. |
| `update.py` | Partial update of a region. |

## Gotchas / fragile spots

- Name uniqueness uses a case-insensitive anchored regex, not a unique index.
- List filtering/sorting delegates to `utils/region/query.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)
