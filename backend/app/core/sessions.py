"""Session token signing/verification (httpOnly cookie auth).

A stateless JWT (HS256) carrying the user's email as ``sub``. Pure utility — no
FastAPI, no DB. The token is placed in an httpOnly cookie by the auth controller
(transport layer); services never touch it.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from .config import Settings
from .errors import UnauthorizedError

_ALGORITHM = "HS256"


def create_session_token(emailid: str, settings: Settings) -> str:
    """Sign a session JWT for the given user email."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": emailid,
        "iat": now,
        "exp": now + timedelta(seconds=settings.session_ttl_seconds),
    }
    return jwt.encode(payload, settings.session_secret, algorithm=_ALGORITHM)


def decode_session_token(token: str, settings: Settings) -> str:
    """Return the email (``sub``) from a valid token, else raise UnauthorizedError."""
    try:
        payload = jwt.decode(token, settings.session_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid or expired session") from exc
    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Invalid session")
    return str(sub)
