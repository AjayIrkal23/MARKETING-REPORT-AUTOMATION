<!-- dox:child v1 -->
# `frontend/src/types/` — TypeScript types

Domain TypeScript types and API contracts.

## What lives here

All TypeScript types live here, mirrored by backend domain. No types should be scattered in components; import from `src/types/<domain>/`.

## Local conventions

- One folder per domain; split UI-specific types into a `-ui` file when large.
- Keep wire types (API contracts) separate from component prop types.

## Key files

| File | Role |
|------|------|
| `api/envelope.ts` | API success/pagination envelopes. |
| `auth/auth.ts` | Auth API contracts. |
| `admin/user.ts` | Admin user domain types. |
| `jsw-stock/stock.ts` | JSW Stock row and query types. |
| `settings/jsw-stock-config.ts` | JSW Stock scheduler config types. |

## Gotchas / fragile spots

- Backend sort/filter literals must match exactly — they are whitelisted on both sides.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`admin/`](admin/CLAUDE.md) · [`api/`](api/CLAUDE.md) · [`auth/`](auth/CLAUDE.md) · [`credit-report/`](credit-report/CLAUDE.md) · [`dashboard/`](dashboard/CLAUDE.md) · [`jsw-stock/`](jsw-stock/CLAUDE.md) · [`jvml-stock/`](jvml-stock/CLAUDE.md) · [`meta/`](meta/CLAUDE.md) · [`report/`](report/CLAUDE.md) · [`settings/`](settings/CLAUDE.md) · [`theme/`](theme/CLAUDE.md) · [`user/`](user/CLAUDE.md)
- Related repo docs: [`../../../frontend_docs/TYPES.md`](../../../frontend_docs/TYPES.md)
