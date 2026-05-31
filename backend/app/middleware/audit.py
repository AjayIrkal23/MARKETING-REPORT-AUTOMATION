"""Pure ASGI audit middleware — captures every HTTP request/response for audit logging.

NOT BaseHTTPMiddleware (avoids body-read deadlocks). Registered as the outermost
middleware so it sees final responses including error envelopes and CORS headers.
"""

from __future__ import annotations

import json
import time
import uuid
from collections.abc import Callable, MutableMapping
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from ..core.config import Settings

# -- Cookie parsing helper ---------------------------------------------------

def _parse_cookie(raw: str, name: str) -> str | None:
    """Extract a single named cookie value from a raw ``Cookie`` header string."""
    for part in raw.split(";"):
        kv = part.strip().split("=", 1)
        if len(kv) == 2 and kv[0].strip() == name:
            return kv[1].strip()
    return None


# -- Header helpers ----------------------------------------------------------

def _headers_dict(scope_headers: list[tuple[bytes, bytes]]) -> dict[str, str]:
    """Convert ASGI scope headers to a lowercase-key dict (last value wins)."""
    return {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope_headers}


def _client_ip(headers: dict[str, str], scope: MutableMapping[str, Any]) -> str | None:
    """Resolve client IP: x-forwarded-for first, else ASGI scope client host."""
    fwd = headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    client = scope.get("client")
    if client:
        return client[0]
    return None


# -- Category / outcome derivation (A0) -------------------------------------

def _category(path: str) -> str:
    if path.startswith("/auth"):
        return "auth"
    if path.startswith("/admin"):
        return "admin"
    return "http"


def _outcome(status: int) -> str:
    if status < 400:
        return "success"
    if status < 500:
        return "failure"
    return "error"


# -- Error envelope extraction -----------------------------------------------

def _parse_error_envelope(body: bytes) -> dict[str, Any] | None:
    """Try to extract the ``error`` dict from an error response envelope."""
    if not body:
        return None
    try:
        data = json.loads(body)
        err = data.get("error")
        if isinstance(err, dict):
            return err
    except Exception:  # noqa: BLE001
        pass
    return None


# -- Actor resolution --------------------------------------------------------

def _resolve_actor(headers: dict[str, str], settings: "Settings") -> str | None:
    """Decode the session cookie to get actor_email. Never raises; returns None on failure."""
    raw_cookie = headers.get("cookie", "")
    if not raw_cookie:
        return None
    token = _parse_cookie(raw_cookie, settings.session_cookie_name)
    if not token:
        return None
    try:
        from ..core.sessions import decode_session_token
        return decode_session_token(token, settings)
    except Exception:  # noqa: BLE001
        return None


# -- Middleware class --------------------------------------------------------

class AuditMiddleware:
    """Pure ASGI middleware that records every auditable HTTP request/response.

    Registered as the outermost layer so it wraps all other middleware and sees
    the final status, CORS headers, and error envelopes.
    """

    def __init__(self, app: Any, settings: "Settings") -> None:
        self.app = app
        self.settings = settings

    # ------------------------------------------------------------------
    def _skip(self, path: str) -> bool:
        s = self.settings
        if path in s.audit_skip_paths:
            return True
        return any(path.startswith(p) for p in s.audit_skip_path_prefixes)

    # ------------------------------------------------------------------
    async def __call__(
        self,
        scope: MutableMapping[str, Any],
        receive: Callable,
        send: Callable,
    ) -> None:
        # Only audit HTTP; bail early when disabled or skipped.
        if scope["type"] != "http" or not self.settings.audit_enabled:
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        method: str = scope.get("method", "")

        if method == "OPTIONS" or self._skip(path):
            await self.app(scope, receive, send)
            return

        cap = self.settings.audit_max_body_bytes
        headers = _headers_dict(scope.get("headers", []))

        # ---- wrap receive to buffer the request body up to cap ------------
        req_body_parts: list[bytes] = []
        req_body_len = 0

        async def _receive() -> Any:
            nonlocal req_body_len
            message = await receive()
            if message.get("type") == "http.request":
                chunk: bytes = message.get("body", b"")
                remaining = cap - req_body_len
                if remaining > 0:
                    req_body_parts.append(chunk[:remaining])
                    req_body_len += len(chunk[:remaining])
            return message

        # ---- wrap send to capture status + content-type + response body ---
        status_code: int = 0
        resp_content_type: str | None = None
        resp_body_parts: list[bytes] = []
        resp_body_len = 0
        resp_total_bytes = 0

        async def _send(message: Any) -> None:
            nonlocal status_code, resp_content_type, resp_body_len, resp_total_bytes
            if message.get("type") == "http.response.start":
                status_code = message.get("status", 0)
                for hk, hv in message.get("headers", []):
                    if hk.decode("latin-1").lower() == "content-type":
                        resp_content_type = hv.decode("latin-1")
                        break
            elif message.get("type") == "http.response.body":
                chunk: bytes = message.get("body", b"")
                resp_total_bytes += len(chunk)
                remaining = cap - resp_body_len
                if remaining > 0:
                    resp_body_parts.append(chunk[:remaining])
                    resp_body_len += len(chunk[:remaining])
            await send(message)

        # ---- run the app, timing it ----------------------------------------
        start = time.perf_counter()
        await self.app(scope, _receive, _send)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # ---- build audit fields -------------------------------------------
        req_body = b"".join(req_body_parts)
        resp_body = b"".join(resp_body_parts)

        actor_email = _resolve_actor(headers, self.settings)
        ip = _client_ip(headers, scope)
        user_agent = headers.get("user-agent")

        route_obj = scope.get("route")
        route: str | None = getattr(route_obj, "path", None)

        content_type = headers.get("content-type")

        from ..services.audit.redact import redact_headers, safe_body

        # ---- build request_meta (query + headers always; body conditional) -
        qs = scope.get("query_string", b"")
        query_str = qs.decode("latin-1") if isinstance(qs, bytes) else str(qs)
        query: dict[str, str] = {}
        if query_str:
            for pair in query_str.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    query[k] = v
        request_meta: dict[str, Any] = {"query": query, "headers": redact_headers(headers)}
        if self.settings.audit_capture_request_body:
            request_meta["body"] = safe_body(req_body, content_type, cap)

        # ---- build response_meta ------------------------------------------
        response_meta: dict[str, Any] | None = None
        if self.settings.audit_capture_response_body:
            response_meta = {"body": safe_body(resp_body, resp_content_type, cap), "bytes": resp_total_bytes}

        # ---- parse error envelope -----------------------------------------
        error: dict[str, Any] | None = None
        if status_code >= 400:
            error = _parse_error_envelope(resp_body)

        # ---- fire-and-forget audit write ----------------------------------
        from ..services.audit.record import spawn_audit

        spawn_audit(
            category=_category(path),
            action="http.request",
            summary=f"{method} {path} -> {status_code}",
            outcome=_outcome(status_code),
            source="http",
            method=method,
            path=path,
            route=route,
            status_code=status_code,
            duration_ms=duration_ms,
            actor_email=actor_email,
            actor_is_admin=None,
            ip=ip,
            user_agent=user_agent,
            request_id=uuid.uuid4().hex,
            request_meta=request_meta,
            response_meta=response_meta,
            error=error,
        )
