<!-- dox:child v1 -->
# `frontend/src/components/auth/login/` — Login page UI

Components for the `/login` route.

## What lives here

Asymmetric split-screen login: brand panel, adaptive login form, and OTP setup form for invited accounts.

## Local conventions

- Login form adapts based on backend `account-status` response.
- Form state lives in `hooks/useLoginForm.ts`; OTP setup state in `hooks/useOtpSetup.ts`.

## Key files

| File | Role |
|------|------|
| `BrandPanel.tsx` | Navy left-side brand panel. |
| `LoginForm.tsx` | Email/password form with activation flow. |
| `OtpSetupForm.tsx` | OTP + password setup for invited users. |
| `hooks/useLoginForm.ts` | Login form state and submit logic. |
| `hooks/useOtpSetup.ts` | OTP confirmation state. |

## Gotchas / fragile spots

- Account-status check happens on email blur; stale responses are discarded if email changes.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: [`hooks/`](hooks/CLAUDE.md)
- Related repo docs: [`../../../../../frontend_docs/COMPONENTS.md`](../../../../../frontend_docs/COMPONENTS.md)
