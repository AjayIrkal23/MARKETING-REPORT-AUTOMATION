"""Audit-domain utilities: payload redaction and safe body extraction.

Pure functions with no I/O.  Imported by the audit writer and the ASGI
middleware to strip secrets before any payload is persisted.

Sensitive key matching is case-insensitive (keys are lowercased before lookup).
Recursion is depth-capped at 6 to prevent DoS on deeply nested payloads.
Long strings are truncated to 2 000 chars with a ``"…(+N)"`` suffix.
"""

from __future__ import annotations

import json
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Substrings that, if present anywhere in a (lowercased) key, mark the value
# sensitive. Substring matching is naming-convention agnostic: it catches
# ``password``, ``newPassword``, ``new_password``, ``currentPassword``,
# ``access_token``, ``refreshToken``, ``clientSecret``, etc. in one rule.
_SENSITIVE_SUBSTRINGS: tuple[str, ...] = (
    "password",
    "passwd",
    "secret",
    "token",
    "apikey",
    "api_key",
    "authorization",
    "cookie",
)

# Exact sensitive keys (lowercased) not covered by the substrings above.
# NB: a bare ``code`` is intentionally NOT here — the OTP field is named ``otp``
# (see schemas/otp.py), and redacting ``code`` would clobber useful API error
# codes (e.g. ``VALIDATION_ERROR``) in captured envelopes.
SENSITIVE_KEYS: frozenset[str] = frozenset(
    {
        "otp",
        "otp_code",
        "otp_hash",
        "pwd",
        "session",
        "app_session",
        "set-cookie",
        "x-api-key",
    }
)

REDACTED: str = "***REDACTED***"


def _is_sensitive(key: str) -> bool:
    """True when *key* names a value that must be redacted before storage."""
    lk = key.lower()
    if lk in SENSITIVE_KEYS:
        return True
    return any(sub in lk for sub in _SENSITIVE_SUBSTRINGS)

_MAX_DEPTH: int = 6
_MAX_STRING_LEN: int = 2_000

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_KEEP_HEADERS: frozenset[str] = frozenset(
    {
        "content-type",
        "user-agent",
        "referer",
        "origin",
        "host",
        "accept",
        "accept-language",
        "accept-encoding",
        "content-length",
    }
)


def _truncate(value: str) -> str:
    """Truncate a string to ``_MAX_STRING_LEN`` chars with a suffix."""
    if len(value) <= _MAX_STRING_LEN:
        return value
    overflow = len(value) - _MAX_STRING_LEN
    return value[:_MAX_STRING_LEN] + f"…(+{overflow})"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def redact(value: Any, depth: int = 0) -> Any:
    """Recursively copy and redact *value*, masking sensitive dict keys.

    - Dict keys are compared case-insensitively against ``SENSITIVE_KEYS``.
    - Recursion is capped at depth ``_MAX_DEPTH`` (6); deeper structures are
      replaced with the string ``"<truncated>"``.
    - String values longer than ``_MAX_STRING_LEN`` are truncated.
    - Non-dict / non-list scalars are returned as-is (strings are truncated).
    """
    if depth > _MAX_DEPTH:
        return "<truncated>"

    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for k, v in value.items():
            if isinstance(k, str) and _is_sensitive(k):
                result[k] = REDACTED
            else:
                result[k] = redact(v, depth + 1)
        return result

    if isinstance(value, list):
        return [redact(item, depth + 1) for item in value]

    if isinstance(value, str):
        return _truncate(value)

    return value


def redact_headers(headers: dict[str, str]) -> dict[str, str]:
    """Return a sanitised copy of *headers* suitable for audit storage.

    Processing steps:
    1. Lowercase all header names.
    2. Drop ``cookie``, ``set-cookie``, ``authorization``, and ``x-api-key``
       outright (their presence is noted by the auth actor resolver; values
       must never be stored).
    3. Keep only headers in ``_KEEP_HEADERS`` (allowlist approach).

    The result is safe to store verbatim; no sensitive values remain.
    """
    _DROP: frozenset[str] = frozenset(
        {"cookie", "set-cookie", "authorization", "x-api-key"}
    )
    out: dict[str, str] = {}
    for k, v in headers.items():
        lk = k.lower()
        if lk in _DROP:
            continue
        if lk in _KEEP_HEADERS:
            out[lk] = _truncate(v) if isinstance(v, str) else v
    return out


def safe_body(raw: bytes, content_type: str | None, cap: int) -> Any:
    """Return a redacted, audit-safe representation of a raw HTTP body.

    Decision tree:
    - Empty *raw* → ``None``.
    - ``len(raw) > cap`` → size marker string (value not stored).
    - ``content_type`` starts with ``"application/json"`` → attempt
      ``json.loads`` + ``redact()``; on parse failure → size marker.
    - Any other content type → size marker string.

    The size marker has the form ``"<{content_type or 'binary'} {len(raw)} bytes>"``.
    """
    if not raw:
        return None

    ct = (content_type or "").split(";")[0].strip().lower()
    size_label = content_type or "binary"

    if len(raw) > cap:
        return f"<{size_label} {len(raw)} bytes>"

    if ct == "application/json":
        try:
            parsed = json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            return f"<{size_label} {len(raw)} bytes>"
        return redact(parsed)

    return f"<{size_label} {len(raw)} bytes>"
