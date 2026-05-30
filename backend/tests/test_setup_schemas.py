"""Schema validation tests for OTP first-login setup DTOs.

Pure-unit: Pydantic v2 validation only; no network, no MongoDB, no async.
Mirrors the style of test_user_query.py (imports, pytest.raises(ValidationError)).

Contract: §3.7 + §3.11 of USER-MANAGEMENT-PLAN.md
  ConfirmSetupRequest:
    - otp: min_length=4, max_length=10
    - newPassword: min_length=8, max_length=128
    - emailid: EmailStr
  RequestOtpRequest:
    - emailid: EmailStr (required, must be a valid email)
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.otp import ConfirmSetupRequest, RequestOtpRequest


# ---------------------------------------------------------------------------
# ConfirmSetupRequest — otp field
# ---------------------------------------------------------------------------


def test_confirm_setup_accepts_valid_payload() -> None:
    req = ConfirmSetupRequest(
        emailid="user@example.com",
        otp="123456",
        newPassword="secureP@ss1",
    )
    assert req.otp == "123456"
    assert req.newPassword == "secureP@ss1"
    assert str(req.emailid) == "user@example.com"


def test_confirm_setup_rejects_otp_too_short() -> None:
    # min_length=4 per contract §3.7 — "123" (3 chars) must fail.
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="123",
            newPassword="secureP@ss1",
        )


def test_confirm_setup_rejects_otp_empty() -> None:
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="",
            newPassword="secureP@ss1",
        )


def test_confirm_setup_rejects_otp_too_long() -> None:
    # max_length=10 per contract §3.7 — 11 chars must fail.
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="12345678901",
            newPassword="secureP@ss1",
        )


def test_confirm_setup_accepts_otp_at_min_boundary() -> None:
    req = ConfirmSetupRequest(
        emailid="user@example.com",
        otp="1234",          # exactly min_length=4
        newPassword="secureP@ss1",
    )
    assert req.otp == "1234"


def test_confirm_setup_accepts_otp_at_max_boundary() -> None:
    req = ConfirmSetupRequest(
        emailid="user@example.com",
        otp="1234567890",    # exactly max_length=10
        newPassword="secureP@ss1",
    )
    assert req.otp == "1234567890"


# ---------------------------------------------------------------------------
# ConfirmSetupRequest — newPassword field
# ---------------------------------------------------------------------------


def test_confirm_setup_rejects_weak_password_too_short() -> None:
    # min_length=8 per contract §3.7 / §3.2 password_min_length — 7 chars must fail.
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="123456",
            newPassword="short7",
        )


def test_confirm_setup_rejects_empty_password() -> None:
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="123456",
            newPassword="",
        )


def test_confirm_setup_rejects_password_too_long() -> None:
    # max_length=128 per contract §3.7 — 129 chars must fail.
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="user@example.com",
            otp="123456",
            newPassword="x" * 129,
        )


def test_confirm_setup_accepts_password_at_min_boundary() -> None:
    req = ConfirmSetupRequest(
        emailid="user@example.com",
        otp="123456",
        newPassword="exactly8",   # exactly min_length=8
    )
    assert req.newPassword == "exactly8"


def test_confirm_setup_accepts_password_at_max_boundary() -> None:
    req = ConfirmSetupRequest(
        emailid="user@example.com",
        otp="123456",
        newPassword="x" * 128,   # exactly max_length=128
    )
    assert len(req.newPassword) == 128


# ---------------------------------------------------------------------------
# ConfirmSetupRequest — emailid field
# ---------------------------------------------------------------------------


def test_confirm_setup_rejects_invalid_email() -> None:
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            emailid="not-an-email",
            otp="123456",
            newPassword="secureP@ss1",
        )


def test_confirm_setup_rejects_missing_email() -> None:
    with pytest.raises(ValidationError):
        ConfirmSetupRequest(
            otp="123456",
            newPassword="secureP@ss1",
        )  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# RequestOtpRequest — emailid field
# ---------------------------------------------------------------------------


def test_request_otp_accepts_valid_email() -> None:
    req = RequestOtpRequest(emailid="someone@jsw.in")
    assert str(req.emailid) == "someone@jsw.in"


def test_request_otp_rejects_plaintext() -> None:
    with pytest.raises(ValidationError):
        RequestOtpRequest(emailid="notanemail")


def test_request_otp_rejects_missing_at_sign() -> None:
    with pytest.raises(ValidationError):
        RequestOtpRequest(emailid="userdomain.com")


def test_request_otp_rejects_empty_string() -> None:
    with pytest.raises(ValidationError):
        RequestOtpRequest(emailid="")


def test_request_otp_rejects_missing_field() -> None:
    with pytest.raises(ValidationError):
        RequestOtpRequest()  # type: ignore[call-arg]


def test_request_otp_normalises_email_case() -> None:
    # Pydantic EmailStr lowercases the domain component.
    req = RequestOtpRequest(emailid="User@Example.COM")
    assert "@" in str(req.emailid)
