"""Auth-domain controllers (thin: call service, wrap in envelope).

Cookie set/clear lives here — the transport layer. Services never touch cookies
or headers (service-layer-standards).

OTP first-login setup controllers added per §3.8 / §3.9:
- ``request_otp_controller``: triggers OTP email (generic 200 always).
- ``confirm_setup_controller``: verifies OTP, activates account, sets session cookie.
"""

from __future__ import annotations

from fastapi import Depends, Response

from ..core.auth_deps import get_current_user
from ..core.config import get_settings
from ..core.responses import SuccessEnvelope, success
from ..core.sessions import create_session_token
from ..schemas.auth import AuthUser, LoginRequest
from ..schemas.otp import ConfirmSetupRequest, GenericMessage, RequestOtpRequest
from ..services.auth.login import login as login_service
from ..services.auth.otp_request import request_setup_otp
from ..services.auth.setup_confirm import confirm_setup


def _set_session_cookie(response: Response, emailid: str) -> None:
    """Mint a session JWT and attach it as an httpOnly cookie."""
    settings = get_settings()
    token = create_session_token(emailid, settings)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


async def login_controller(
    payload: LoginRequest, response: Response
) -> SuccessEnvelope[AuthUser]:
    user = await login_service(payload)
    _set_session_cookie(response, user.emailid)
    return success(user, message="Login successful")


async def me_controller(
    current_user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[AuthUser]:
    return success(current_user, message="Session active")


async def logout_controller(response: Response) -> SuccessEnvelope[AuthUser | None]:
    settings = get_settings()
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return success(None, message="Logged out")


async def request_otp_controller(
    payload: RequestOtpRequest,
) -> SuccessEnvelope[GenericMessage]:
    """``POST /auth/setup/request-otp`` — send (or silently skip) a setup OTP.

    Always returns a generic 200 so callers cannot enumerate registered emails.
    The 60-second resend throttle is enforced inside the service only when the
    user is confirmed-invited (to avoid timing-based enumeration).
    """
    message = await request_setup_otp(payload.emailid)
    return success(GenericMessage(message=message))


async def confirm_setup_controller(
    payload: ConfirmSetupRequest,
    response: Response,
) -> SuccessEnvelope[AuthUser]:
    """``POST /auth/setup/confirm`` — verify OTP, activate account, issue session.

    The service performs all validation (invited status, OTP expiry / attempts /
    match, password hashing, status=active).  On success the controller mints a
    session cookie via ``_set_session_cookie`` — exactly as ``login_controller``
    does — so the user is immediately logged in.
    """
    user = await confirm_setup(payload)
    _set_session_cookie(response, user.emailid)
    return success(user, message="Account activated. You are now logged in.")
