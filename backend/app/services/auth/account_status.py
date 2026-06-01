"""Auth service: pre-login account-status check.

Powers the login form's adaptive flow — when the typed email belongs to an
invited (not-yet-active) account, the frontend hides the password field and
swaps "Sign in" for "Activate your account".

Enumeration scope (deliberate, per product requirement): this check reveals
*only* accounts that are pending activation. Active accounts, disabled accounts,
and unknown emails are indistinguishable (all return ``False``), so active-user
existence is never disclosed. The route is rate-limited with the same limiter as
``/auth/login`` to throttle scraping.
"""

from __future__ import annotations

from ...models import User


async def get_account_needs_activation(emailid: str) -> bool:
    """Return ``True`` only for an existing invited (not-active) account.

    Invited accounts have ``status == "invited"`` and no password yet (the same
    branch ``login`` treats as ``PASSWORD_SETUP_REQUIRED``). An admin password
    reset also nulls the password + sets status invited, so ``password is None``
    is treated as needing activation too. Active / disabled / unknown → ``False``.

    Args:
        emailid: The email address typed into the login form.

    Returns:
        Whether the account is pending first-login activation.
    """
    user = await User.find_one(User.emailid == emailid)
    if user is None:
        return False
    return user.status == "invited" or user.password is None
