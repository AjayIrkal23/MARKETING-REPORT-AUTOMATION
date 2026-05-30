"""OTP generation, hashing, and verification helpers.

Numeric OTPs are generated with the ``secrets`` module (CSPRNG) and stored
hashed at rest using bcrypt (via :func:`core.security.hash_password` / the
underlying ``bcrypt`` library) — the raw OTP is NEVER persisted or returned
in any API response.

Contract: §3.4 of USER-MANAGEMENT-PLAN.md
  - generate_otp(length) -> cryptographically-random numeric string
  - hash_otp(otp)        -> bcrypt hash string
  - verify_otp(otp, otp_hash) -> bool
"""

from __future__ import annotations

import secrets

from app.core.security import hash_password, verify_password


def generate_otp(length: int) -> str:
    """Return a cryptographically-random numeric string of *length* digits.

    Uses :func:`secrets.choice` over the decimal digit alphabet so every
    digit is drawn from the system CSPRNG (OWASP A02 / A07 compliant).

    Args:
        length: Number of digits in the OTP (e.g. 6).

    Returns:
        A numeric string, zero-padded as needed (e.g. ``"042817"``).

    Raises:
        ValueError: If *length* is not a positive integer.
    """
    if length < 1:
        raise ValueError(f"OTP length must be >= 1, got {length!r}")

    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


def hash_otp(otp: str) -> str:
    """Return a bcrypt hash of *otp*.

    Delegates to :func:`core.security.hash_password` so the bcrypt work-factor
    and encoding are consistent across the application (OWASP A02).

    Args:
        otp: The raw numeric OTP string to hash.

    Returns:
        A bcrypt hash string suitable for storing in ``User.otp_hash``.
    """
    return hash_password(otp)


def verify_otp(otp: str, otp_hash: str) -> bool:
    """Return ``True`` if *otp* matches the stored *otp_hash*.

    Delegates to :func:`core.security.verify_password` for constant-time
    comparison (timing-safe; OWASP A07).

    Args:
        otp:      The raw numeric OTP submitted by the user.
        otp_hash: The bcrypt hash stored in ``User.otp_hash``.

    Returns:
        ``True`` on match, ``False`` on mismatch or any error.
    """
    return verify_password(otp, otp_hash)
