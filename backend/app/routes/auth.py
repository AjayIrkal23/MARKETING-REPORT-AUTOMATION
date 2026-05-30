"""Auth routes.

OTP first-login setup routes added per §3.8 / §3.9:
- ``POST /auth/setup/request-otp`` — rate-limited; sends OTP for invited users.
- ``POST /auth/setup/confirm``     — rate-limited; verifies OTP and activates account.
Both share the same per-IP sliding-window limiter as ``/auth/login``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..controllers import auth as auth_ctrl
from ..core.ratelimit import login_rate_limit
from ..core.responses import SuccessEnvelope
from ..schemas.auth import AuthUser
from ..schemas.otp import GenericMessage

router = APIRouter(prefix="/auth", tags=["auth"])

router.add_api_route(
    "/login", auth_ctrl.login_controller, methods=["POST"],
    dependencies=[Depends(login_rate_limit)],
    response_model=SuccessEnvelope[AuthUser],
)
# /me is gated by get_current_user (declared on the controller); it restores the
# session on app reload since the httpOnly cookie isn't JS-readable.
router.add_api_route(
    "/me", auth_ctrl.me_controller, methods=["GET"],
    response_model=SuccessEnvelope[AuthUser],
)
router.add_api_route(
    "/logout", auth_ctrl.logout_controller, methods=["POST"],
    response_model=SuccessEnvelope[AuthUser | None],
)

# --- OTP first-login setup (§3.8) ---
# Rate-limited with the same limiter as /login to prevent enumeration + brute-force.

router.add_api_route(
    "/setup/request-otp",
    auth_ctrl.request_otp_controller,
    methods=["POST"],
    dependencies=[Depends(login_rate_limit)],
    response_model=SuccessEnvelope[GenericMessage],
    summary="Request a first-login OTP (always generic 200)",
)

router.add_api_route(
    "/setup/confirm",
    auth_ctrl.confirm_setup_controller,
    methods=["POST"],
    dependencies=[Depends(login_rate_limit)],
    response_model=SuccessEnvelope[AuthUser],
    summary="Confirm OTP, set password, activate account",
)
