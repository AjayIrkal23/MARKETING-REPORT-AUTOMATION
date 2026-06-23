<!-- dox:child v1 -->
# `backend/app/scripts/` — Standalone CLI scripts

One-off utilities and admin commands run directly from the backend virtual env.

## What lives here

Each script is a self-contained module that can be executed with
`python -m app.scripts.<name>` from `backend/`. Scripts manage their own
logging and, when needed, their own database lifecycle.

## Local conventions

- Run from `backend/` with the project venv active.
- Scripts must not be imported by application code at runtime.
- Keep scripts idempotent where possible.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `seed.py` | Seed the initial admin user. Idempotent. |
| `send_test_email.py` | Verify SMTP/Mailjet delivery end-to-end. |
| `backfill_row_hashes.py` | Backfill `row_hash` and clean duplicates for stock/credit collections. |
| `cleanup_ship_to_2.py` | Remove deprecated `ship_to_2` / `ship_to_customer_2` fields. |

## Gotchas / fragile spots

- `send_test_email.py` surfaces SMTP exceptions (unlike `core.email.send_email`,
  which swallows them) so you can diagnose credential/sender issues.
- `cleanup_ship_to_2.py` talks to MongoDB via Motor directly, not Beanie, so it
  works even if the document shape has changed.
- `seed.py` skips creation when `SEED_ADMIN_PASSWORD` is unset.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend/README.md`](../../README.md)
