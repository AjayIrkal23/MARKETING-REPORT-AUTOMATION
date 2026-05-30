"""OTP first-login setup request/response DTOs.

Contract: §3.7 of USER-MANAGEMENT-PLAN.md.
These schemas cover the two public-facing OTP setup endpoints
(``/auth/setup/request-otp`` and ``/auth/setup/confirm``).
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RequestOtpRequest(BaseModel):
    """Body for ``POST /auth/setup/request-otp``.

    Only ``emailid`` is needed: the backend looks up the invited user by email.
    The response is always generic (no user-enumeration).
    """

    emailid: EmailStr


class ConfirmSetupRequest(BaseModel):
    """Body for ``POST /auth/setup/confirm``.

    The user supplies the 6-digit OTP they received, plus the new password
    they wish to set (min 8 chars per §3.2 password_min_length policy).
    ``otp`` has a generous max_length to survive padding/copy-paste without
    leaking a hash-DoS surface.
    """

    emailid: EmailStr
    otp: str = Field(min_length=4, max_length=10)
    newPassword: str = Field(min_length=8, max_length=128)


class GenericMessage(BaseModel):
    """Generic single-field message returned by low-information endpoints.

    Used by ``/auth/setup/request-otp`` to avoid user enumeration: the same
    shape is returned whether or not the user exists / OTP was sent.
    """

    message: str
