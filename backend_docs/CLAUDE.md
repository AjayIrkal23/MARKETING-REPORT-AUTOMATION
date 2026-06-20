<!-- dox:child v1 -->
# `backend_docs/` — Backend architecture documentation

Long-form, numbered backend documentation. Complements the per-directory
`CLAUDE.md` files with cross-cutting topics like API contracts, conventions, and
security.

## What lives here

| File | Topic |
|------|-------|
| `README.md` | Backend docs landing page / table of contents |
| `ADDING_A_DOMAIN.md` | How to add a new backend domain end-to-end |
| `API_CONTRACT.md` | Response envelope, pagination, error shape |
| `ARCHITECTURE.md` | Layered architecture overview |
| `CONVENTIONS.md` | Naming, imports, typing, file-size rules |
| `DATABASE.md` | MongoDB / Beanie model conventions |
| `ERROR_HANDLING.md` | `AppError` taxonomy and centralized handlers |
| `PROJECT_REFERENCE_LINKAGE.md` | Cross-layer file map |
| `SECURITY.md` | Auth, secrets, OWASP checklist |
| `SERVICES.md` | Service-layer responsibilities and patterns |

## Local conventions

- Update the relevant doc when a backend convention, contract, or security rule changes.
- Per-directory rules still live in the directory's own `CLAUDE.md`; these docs explain
  the *why* and the *cross-cutting* details.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none (files only)
- Code tree: [`../backend/CLAUDE.md`](../backend/CLAUDE.md)
