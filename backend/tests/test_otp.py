"""OTP helper unit tests — generate / hash / verify.

Pure-unit: no network, no MongoDB, no async.
Mirrors the style of test_security.py.

Contract: §3.4 + §3.11 of USER-MANAGEMENT-PLAN.md
  - generate_otp(length) -> numeric string of exactly *length* digits
  - hash_otp(otp)        -> bcrypt hash (not equal to plaintext)
  - verify_otp(otp, otp_hash) -> True on match, False on mismatch / garbage
"""

from __future__ import annotations

import pytest

from app.core.otp import generate_otp, hash_otp, verify_otp


# ---------------------------------------------------------------------------
# generate_otp
# ---------------------------------------------------------------------------


def test_generate_otp_default_length() -> None:
    otp = generate_otp(6)
    assert len(otp) == 6


def test_generate_otp_is_all_digits() -> None:
    otp = generate_otp(6)
    assert otp.isdigit()


def test_generate_otp_length_one() -> None:
    otp = generate_otp(1)
    assert len(otp) == 1
    assert otp.isdigit()


def test_generate_otp_length_eight() -> None:
    otp = generate_otp(8)
    assert len(otp) == 8
    assert otp.isdigit()


def test_generate_otp_uniqueness() -> None:
    # With 6 digits there are 10^6 combinations; two calls colliding is ~0.1%.
    # We draw 20 samples and assert at least two differ — collapses to all-same
    # only with probability 10^(6*1-6*20) ≈ 0 for a real CSPRNG.
    otps = {generate_otp(6) for _ in range(20)}
    assert len(otps) > 1, "generate_otp returned the same value 20 times — CSPRNG broken"


def test_generate_otp_invalid_length_zero() -> None:
    with pytest.raises(ValueError):
        generate_otp(0)


def test_generate_otp_invalid_length_negative() -> None:
    with pytest.raises(ValueError):
        generate_otp(-3)


# ---------------------------------------------------------------------------
# hash_otp
# ---------------------------------------------------------------------------


def test_hash_is_not_plaintext() -> None:
    otp = generate_otp(6)
    h = hash_otp(otp)
    assert h != otp


def test_hash_starts_with_bcrypt_prefix() -> None:
    h = hash_otp("123456")
    assert h.startswith("$2")  # bcrypt identifier ($2a$, $2b$, $2y$)


def test_hash_is_deterministically_distinct() -> None:
    # bcrypt with random salt — two hashes of the same input differ.
    h1 = hash_otp("123456")
    h2 = hash_otp("123456")
    assert h1 != h2


# ---------------------------------------------------------------------------
# verify_otp — correct match
# ---------------------------------------------------------------------------


def test_verify_returns_true_on_correct_otp() -> None:
    otp = generate_otp(6)
    h = hash_otp(otp)
    assert verify_otp(otp, h) is True


def test_verify_correct_static_otp() -> None:
    otp = "042817"
    h = hash_otp(otp)
    assert verify_otp(otp, h) is True


# ---------------------------------------------------------------------------
# verify_otp — mismatch / wrong input
# ---------------------------------------------------------------------------


def test_verify_returns_false_on_wrong_otp() -> None:
    h = hash_otp("123456")
    assert verify_otp("999999", h) is False


def test_verify_returns_false_on_empty_otp() -> None:
    h = hash_otp("123456")
    assert verify_otp("", h) is False


def test_verify_returns_false_on_garbage_hash() -> None:
    # A malformed stored hash must return False, not raise — mirrors test_security.py style.
    assert verify_otp("123456", "not-a-real-bcrypt-hash") is False


def test_verify_returns_false_on_empty_hash() -> None:
    assert verify_otp("123456", "") is False


def test_verify_returns_false_on_prefix_match() -> None:
    # "1234" should NOT match a hash of "123456" — no substring match.
    h = hash_otp("123456")
    assert verify_otp("1234", h) is False


def test_verify_single_use_simulation() -> None:
    # After clearing (setting hash to a sentinel), a re-verify must fail.
    otp = generate_otp(6)
    h = hash_otp(otp)
    assert verify_otp(otp, h) is True
    cleared_hash = ""           # service sets otp_hash=None; we use "" as unit stand-in
    assert verify_otp(otp, cleared_hash) is False
