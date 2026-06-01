"""Auth-domain controllers (thin: call service, wrap in envelope).

Cookie set/clear lives here — the transport layer. Services never touch cookies
or headers (service-layer-standards).

OTP first-login setup controllers added per §3.8 / §3.9:
- ``request_otp_controller``: triggers OTP email (generic 200 always).
- ``confirm_setup_controller``: verifies OTP, activates account, sets session cookie.
"""

from __future__ import annotations

from fastapi import Depends, Request, Response

from ..core.auth_deps import get_current_user
from ..core.config import get_settings
from ..core.responses import SuccessEnvelope, success
from ..core.sessions import create_session_token, decode_session_token
from ..schemas.auth import (
    AccountStatusRequest,
    AccountStatusResponse,
    AuthUser,
    LoginRequest,
)
from ..schemas.otp import ConfirmSetupRequest, GenericMessage, RequestOtpRequest
from ..services.audit.events import audit_auth_event
from ..services.auth.account_status import get_account_needs_activation
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


async def account_status_controller(
    payload: AccountStatusRequest,
) -> SuccessEnvelope[AccountStatusResponse]:
    """``POST /auth/account-status`` — does this email need activation?

    Returns ``needsActivation=True`` only for invited (not-yet-active) accounts so
    the login form can hide the password field and offer activation. Active,
    disabled, and unknown emails all return ``False`` (no active-user enumeration).
    """
    needs = await get_account_needs_activation(payload.emailid)
    return success(AccountStatusResponse(needsActivation=needs))


async def me_controller(
    current_user: AuthUser = Depends(get_current_user),
) -> SuccessEnvelope[AuthUser]:
    return success(current_user, message="Session active")


async def logout_controller(
    request: Request,
    response: Response,
) -> SuccessEnvelope[AuthUser | None]:
    settings = get_settings()
    # Resolve actor email from session cookie if present (best-effort; never raises).
    actor_email: str | None = None
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        try:
            actor_email = decode_session_token(token, settings)
        except Exception:  # noqa: BLE001
            pass
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    if actor_email:
        await audit_auth_event(
            "auth.logout",
            f"User {actor_email} logged out",
            actor_email=actor_email,
        )
    else:
        await audit_auth_event(
            "auth.logout",
            "Session logged out",
            actor_email=None,
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
