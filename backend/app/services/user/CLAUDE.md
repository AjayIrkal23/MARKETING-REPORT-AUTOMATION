<!-- dox:child v1 -->
# `backend/app/services/user/` — User services

Authenticated user listing and idempotent admin seeding.

## What lives here

User-facing business logic that does not belong in the admin user-management
domain. The startup admin seed is also here.

## Local conventions

- `list.py` returns `(list[UserPublic], PaginationMeta)` using `utils/user/query.py`.
- `seed.py` is safe to run repeatedly; it is invoked from the app lifespan and
  from `scripts/seed.py`.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `list.py` | Backend-driven paginated user list for `GET /users`. |
| `seed.py` | Idempotent seed-admin creation/backfill. |

## Gotchas / fragile spots

- `seed.py` returns `None` when `SEED_ADMIN_PASSWORD` is unset so no default
  password is provisioned.
- Existing seed admin docs created before the `status`/`name` fields are
  backfilled to `active` / `"Administrator"` / `isAdmin=True`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)
