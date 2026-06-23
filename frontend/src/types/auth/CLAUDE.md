<!-- dox:child v1 -->
# `frontend/src/types/auth/` — Auth domain types

TypeScript types for authentication.

## What lives here

Contains wire types for login/OTP, session state, and login form UI types.

## Local conventions

- Wire types (`auth.ts`, `otp.ts`) are distinct from the Redux session model (`session.ts`).

## Key files

| File | Role |
|------|------|
| `auth.ts` | Login credentials and `AuthUser` wire types. |
| `session.ts` | Redux auth state and `SessionUser`. |
| `otp.ts` | OTP request/confirm wire types. |
| `login-ui.ts` | Login/OtpSetup component prop and hook result types. |

## Gotchas / fragile spots

- Field name is `emailid` to match the backend schema.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../frontend_docs/TYPES.md`](../../../../frontend_docs/TYPES.md)
