"""Auth service: confirm OTP setup and activate account.

Business rules (§3.8 / §3.9 / §3.10 of USER-MANAGEMENT-PLAN.md):
- Only valid for users with status == "invited".
- Checks: OTP not expired (10-min TTL), attempts <= max (5), OTP matches hash.
- On success: hash and store newPassword, set status="active", clear all OTP
  fields, stamp lastlogined.
- On bad OTP: increment attempts; when attempts >= max, clear OTP hash
  (invalidate) so the user must request a fresh code.
- Generic 400 for ALL failure paths — no enumeration; no detail leakage.
- Returns AuthUser on success (controller handles cookie issuance).
"""

from __future__ import annotations

from datetime import datetime, timezone

from ...core.errors import ValidationError
from ...core.otp import verify_otp
from ...core.security import hash_password
from ...core.config import get_settings
from ...models import User
from ...schemas.auth import AuthUser
from ...schemas.otp import ConfirmSetupRequest
from ..audit.events import audit_auth_event


_GENERIC_FAIL = "Invalid or expired code. Please request a new one."


async def confirm_setup(payload: ConfirmSetupRequest) -> AuthUser:
    """Verify the OTP, set the user's password, and activate the account.

    Args:
        payload: Validated ``ConfirmSetupRequest`` (emailid, otp, newPassword).

    Returns:
        ``AuthUser`` — the now-active user (controller sets session cookie).

    Raises:
        ValidationError: For any failure: user not found, wrong status, OTP
            expired, max attempts reached, or OTP mismatch.  Always generic
            to prevent user enumeration (OWASP A07).
    """
    settings = get_settings()
    user = await User.find_one(User.emailid == payload.emailid)

    # --- Gate: user must exist and be in invited state ---
    if user is None or user.status != "invited":
        raise ValidationError(_GENERIC_FAIL)

    # --- Gate: OTP must exist and not be expired ---
    now = datetime.now(timezone.utc)
    if user.otp_hash is None or user.otp_expires_at is None:
        raise ValidationError(_GENERIC_FAIL)

    if now > user.otp_expires_at:
        # Expired — clear stored hash to force a fresh request
        user.otp_hash = None
        user.otp_expires_at = None
        user.otp_attempts = 0
        await user.save()
        raise ValidationError(_GENERIC_FAIL)

    # --- Gate: max attempts not exceeded ---
    if user.otp_attempts >= settings.otp_max_attempts:
        # Already exhausted — invalidate (belt-and-suspenders; should have been
        # cleared on the final failed attempt, but guard again here)
        user.otp_hash = None
        user.otp_expires_at = None
        user.otp_attempts = 0
        await user.save()
        raise ValidationError(_GENERIC_FAIL)

    # --- Verify OTP ---
    if not verify_otp(payload.otp, user.otp_hash):
        user.otp_attempts += 1
        # Invalidate hash when max attempts consumed so user must re-request
        if user.otp_attempts >= settings.otp_max_attempts:
            user.otp_hash = None
            user.otp_expires_at = None
            user.otp_attempts = 0
        await user.save()
        raise ValidationError(_GENERIC_FAIL)

    # --- Success: hash password, activate, clear OTP, stamp login ---
    user.password = hash_password(payload.newPassword)
    user.status = "active"
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.otp_last_sent_at = None
    user.lastlogined = now
    await user.save()

    await audit_auth_event(
        "auth.account_activated",
        f"Account activated for {user.emailid}",
        actor_email=user.emailid,
    )
    return AuthUser(
        emailid=user.emailid,
        isAdmin=user.isAdmin,
        lastlogined=user.lastlogined,
    )
