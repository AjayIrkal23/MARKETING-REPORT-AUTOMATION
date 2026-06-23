<!-- dox:child v1 -->
# `frontend/src/api/auth/setup/` — First-login OTP setup API

HTTP wrappers for the `/auth/setup/*` first-login flow.

## What lives here

Invited users set their password via an emailed OTP. These endpoints are separated from the main auth flow because they are only used during account activation.

## Local conventions

- OTP endpoints always return generic success — never expose account enumeration.
- Types come from `src/types/auth/otp.ts`.

## Key files

| File | Role |
|------|------|
| `requestOtp.ts` | `POST /auth/setup/request-otp` — trigger emailed OTP. |
| `confirm.ts` | `POST /auth/setup/confirm` — confirm OTP and set password. |

## Gotchas / fragile spots

- Request failures are swallowed in the UI to prevent user enumeration.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/API_LAYER.md`](../../../../../frontend_docs/API_LAYER.md)
