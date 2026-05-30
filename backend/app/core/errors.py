"""Domain error taxonomy.

Services raise these typed errors; the centralized exception handlers
(``core.exception_handlers``) map them to the standard error envelope and the
HTTP status codes mandated by ``backend-error-handling``. Clients never see raw
internal exceptions or stack traces.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for all expected, client-safe domain errors."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str = "Something went wrong", details: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ValidationError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMITED"

    def __init__(
        self,
        message: str = "Too many requests. Please try again later.",
        details: Any | None = None,
    ) -> None:
        super().__init__(message, details)


class PasswordSetupRequiredError(AppError):
    """Raised when a user with status='invited' attempts login.

    The frontend catches code='PASSWORD_SETUP_REQUIRED' (409) and redirects
    the user into the OTP first-login setup flow. Contract: §3.3.
    """

    status_code = 409
    code = "PASSWORD_SETUP_REQUIRED"


class AccountDisabledError(AppError):
    """Raised when a user with status='disabled' attempts login.

    The frontend catches code='ACCOUNT_DISABLED' (403) and surfaces a
    "your account has been disabled" message. Contract: §3.3.
    """

    status_code = 403
    code = "ACCOUNT_DISABLED"
