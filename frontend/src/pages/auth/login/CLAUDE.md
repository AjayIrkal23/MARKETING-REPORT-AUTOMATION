<!-- dox:child v1 -->
# `frontend/src/pages/auth/login/` — Login page

`/login` route page.

## What lives here

Asymmetric split-screen login page. Toggles between `LoginForm` and `OtpSetupForm` based on whether the email belongs to an invited account.

## Local conventions

- Page is stateless except for the `setupEmail` toggle.
- Redirects authenticated users to `/home`.

## Key files

| File | Role |
|------|------|
| `index.tsx` | Login page component. |

## Gotchas / fragile spots

- The `setupEmail` state determines which form is rendered.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../../../frontend_docs/ROUTING.md`](../../../../../frontend_docs/ROUTING.md)
