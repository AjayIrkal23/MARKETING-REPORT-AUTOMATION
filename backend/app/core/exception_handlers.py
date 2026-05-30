"""Centralized exception handling.

Normalizes every failure into the standard error envelope, maps domain errors to
their HTTP status, and hides stack traces / driver errors from clients
(``backend-error-handling``). Registered on the app in ``app.main``.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .errors import AppError
from .responses import ErrorBody, ErrorEnvelope

logger = logging.getLogger(__name__)


def _envelope(code: str, message: str, details: object | None = None) -> dict:
    return ErrorEnvelope(error=ErrorBody(code=code, message=message, details=details)).model_dump()


async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(exc.code, exc.message, exc.details),
    )


async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=_envelope("VALIDATION_ERROR", "Request validation failed", exc.errors()),
    )


async def _handle_http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Only surface string details; a dict/object detail would leak its repr.
    detail = exc.detail if isinstance(exc.detail, str) else "An error occurred"
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope("HTTP_ERROR", detail),
    )


async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
    # Log the real error server-side; never leak internals to the client.
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=_envelope("INTERNAL_ERROR", "An unexpected error occurred"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Wire all centralized handlers onto the app."""
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected)
