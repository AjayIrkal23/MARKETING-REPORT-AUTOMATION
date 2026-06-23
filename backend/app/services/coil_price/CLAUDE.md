<!-- dox:child v1 -->
# `backend/app/services/coil_price/` — Coil price management

CRUD and listing services for per-quantity coil prices.

## What lives here

Business logic for the `coil_prices` collection. Admin controllers gate these
operations with `get_current_admin`.

## Local conventions

- One action per file (`create.py`, `update.py`, `delete.py`, `get.py`, `list.py`).
- Enforce `quantity` uniqueness at the service layer.
- Return `CoilPricePublic` DTOs via `serialize.py`.
- Emit `coil_config` audit events on mutations.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `create.py` | Insert a new coil price. |
| `delete.py` | Hard-delete a coil price. |
| `get.py` | Fetch a single coil price. |
| `list.py` | Backend-driven paginated list. |
| `serialize.py` | Document → `CoilPricePublic` mapper. |
| `update.py` | Partial update of a coil price. |

## Gotchas / fragile spots

- `quantity` uniqueness is checked with an exact-match query rather than a
  MongoDB unique index.
- List filtering/sorting delegates to `utils/coil_price/query.py`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)
