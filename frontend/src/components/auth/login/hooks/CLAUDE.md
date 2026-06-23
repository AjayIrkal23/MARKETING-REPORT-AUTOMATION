<!-- dox:child v1 -->
# `frontend/src/components/auth/login/hooks/` — Login form hooks

Feature hooks for the login page.

## What lives here

Contains `useLoginForm` (email/password + account-status flow) and `useOtpSetup` (OTP confirmation + password set).

## Local conventions

- Do not call `login()` directly from components — go through `useLoginForm`.
- Remember-me email is persisted in `localStorage`.

## Key files

| File | Role |
|------|------|
| `useLoginForm.ts` | Form state, account-status check, login dispatch. |
| `useOtpSetup.ts` | OTP verification and password setup. |

## Gotchas / fragile spots

- `PASSWORD_SETUP_REQUIRED` is handled as a safety net for invited accounts.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../../frontend_docs/COMPONENTS.md`](../../../../../../frontend_docs/COMPONENTS.md)
