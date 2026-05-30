"""bcrypt hashing helpers — never store plaintext, verify correctly."""

from __future__ import annotations

from app.core.security import hash_password, verify_password


def test_hash_is_not_plaintext() -> None:
    h = hash_password("s3cret")
    assert h != "s3cret"
    assert h.startswith("$2")  # bcrypt hash prefix


def test_verify_correct_password() -> None:
    h = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", h) is True


def test_verify_wrong_password() -> None:
    h = hash_password("correct horse battery staple")
    assert verify_password("wrong", h) is False


def test_verify_handles_garbage_hash() -> None:
    # A malformed stored hash must return False, not raise.
    assert verify_password("anything", "not-a-real-bcrypt-hash") is False
