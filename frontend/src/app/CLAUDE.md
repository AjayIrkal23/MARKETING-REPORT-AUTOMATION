<!-- dox:child v1 -->
# `frontend/src/app/` — Redux store wiring

Redux store configuration and typed hooks.

## What lives here

Contains the Redux store root and the strongly typed `useAppDispatch` / `useAppSelector` wrappers. Redux slices live under `src/store/`; this folder only wires them together.

## Local conventions

- Always import typed hooks from here — never raw `useDispatch` / `useSelector`.
- Register new slices in `store.ts`.

## Key files

| File | Role |
|------|------|
| `store.ts` | Root Redux store with reducer map. |
| `hooks.ts` | Typed `useAppDispatch` and `useAppSelector`. |

## Gotchas / fragile spots

- Slices are not defined here; keep domain slices in `src/store/<domain>/`.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../frontend_docs/STATE_MANAGEMENT.md`](../../../frontend_docs/STATE_MANAGEMENT.md)
