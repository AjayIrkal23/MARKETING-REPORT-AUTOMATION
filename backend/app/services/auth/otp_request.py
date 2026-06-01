"""Auth service: request a first-login setup OTP.

Business rules (§3.8 / §3.9 / §3.10 of USER-MANAGEMENT-PLAN.md):
- Only fires for users whose status is "invited" (password is None).
- 60-second resend throttle: a new OTP cannot be sent until the interval elapses.
- Generates a fresh OTP, hashes it with bcrypt, stores hash + expiry + zeroed
  attempt counter on the User document, then sends the email.
- Response is always generic ("If your account exists …") — no user enumeration.
- A missing or non-invited user is silently ignored; the same generic 200 is returned.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from ...core.config import get_settings
from ...core.email import render_otp_email, send_email
from ...core.errors import RateLimitError
from ...core.otp import generate_otp, hash_otp
from ...models import User
from ..audit.events import audit_auth_event


_GENERIC_MSG = (
    "If your email is registered and your account is pending setup, "
    "you will receive a one-time code shortly."
)


async def request_setup_otp(emailid: str) -> str:
    """Send (or silently skip) a setup OTP for *emailid*.

    Args:
        emailid: The email address submitted by the user.

    Returns:
        A generic message string (constant; does not reveal user existence).

    Raises:
        RateLimitError: When a valid OTP was already sent within the resend
            throttle window *and* the user is invited.  (Only raised when we
            can confirm throttle — otherwise silently ignored to avoid
            enumeration.)
    """
    settings = get_settings()
    user = await User.find_one(User.emailid == emailid)

    # Silently skip: user not found or not in invited state.
    # We still return the generic message — caller never learns whether the
    # user exists (OWASP A07 — no enumeration).
    if user is None or user.status != "invited":
        return _GENERIC_MSG

    # --- 60-second resend throttle (§3.10) ---
    # Throttle is only enforced when we know the user is invited, to prevent
    # timing-based enumeration: we raise for legitimate throttle violations.
    now = datetime.now(timezone.utc)
    if user.otp_last_sent_at is not None:
        elapsed = (now - user.otp_last_sent_at).total_seconds()
        if elapsed < settings.otp_resend_interval_seconds:
            remaining = int(settings.otp_resend_interval_seconds - elapsed)
            raise RateLimitError(
                f"Please wait {remaining} second(s) before requesting a new code."
            )

    # --- Generate, hash, store ---
    raw_otp = generate_otp(settings.otp_length)
    otp_hash = hash_otp(raw_otp)
    expires_at = now + timedelta(seconds=settings.otp_ttl_seconds)

    user.otp_hash = otp_hash
    user.otp_expires_at = expires_at
    user.otp_attempts = 0
    user.otp_last_sent_at = now
    await user.save()

    # --- Send email (failure is logged internally; never re-raised) ---
    ttl_minutes = settings.otp_ttl_seconds // 60
    subject, text, html = render_otp_email(raw_otp, ttl_minutes, settings.app_name)
    await send_email(user.emailid, subject, text, html)
    await audit_auth_event(
        "auth.otp_requested",
        f"Setup OTP sent to {user.emailid}",
        actor_email=user.emailid,
    )

    return _GENERIC_MSG
