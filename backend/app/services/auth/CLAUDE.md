<!-- dox:child v1 -->
# `backend/app/services/auth/` — Authentication services

Login, account-status checks, and OTP-based first-login setup.

## What lives here

Credential verification and account-activation logic. Session cookie handling
lives in `controllers/auth.py`; these services are transport-free.

## Local conventions

- Return generic errors for unknown email / bad password to prevent user
  enumeration.
- Branch on `User.status`: `invited` → `PasswordSetupRequiredError`,
  `disabled` → `AccountDisabledError`, `active` → verify bcrypt hash.
- OTPs are generated with `secrets`, stored as bcrypt hashes, and never returned
  in API responses.

## Key files

| File | Role |
|------|------|
| `__init__.py` | Empty package marker. |
| `login.py` | Verify credentials, stamp `lastlogined`, return `AuthUser`. |
| `account_status.py` | Check whether an email needs first-login activation. |
| `otp_request.py` | Generate and email a setup OTP (throttled). |
| `setup_confirm.py` | Verify OTP, hash password, activate account. |

## Gotchas / fragile spots

- `otp_request.py` returns a generic message even when the email does not exist.
- `setup_confirm.py` uses a single generic error for every failure path to avoid
  leaking whether an email exists or an OTP is expired.
- OTP attempts are capped; exhausting them invalidates the stored hash.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`backend_docs/SECURITY.md`](../../../backend_docs/SECURITY.md)
